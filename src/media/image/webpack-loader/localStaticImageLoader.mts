import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import svgo from 'svgo';
import type { LoaderDefinitionFunction } from 'webpack';
import { type PictureSource, getImageSourcesNotSvg, getSvgEntry, hash, readImageInfoFromBuffer } from '../internal.mjs';

export interface LocalStaticImageImport {
	// Hash of the original image. Can be used inside the react key prop.
	contentHash: string;
	// Filename of the original image without extension.
	filename: string;
}

// biome-ignore lint/style/useNamingConvention: We want to emphasize this is an internal interface
export interface INTERNAL_LocalStaticImageImport extends LocalStaticImageImport {
	// Width of the image. Width is specified by user in the import query or taken from the original image.
	w: number;
	// Height of the image. Height is either inferred from the user specified width or or taken from the original image.
	h: number;

	// Either i and s are present OR g is present. Never both

	// Is size specified by the user in the loader query.
	i?: boolean;

	// Optimized sources of the image.
	s?: INTERNAL_LowOverheadPictureSource[];

	// src of the svG image
	g?: string;
}

// biome-ignore lint/style/useNamingConvention: We want to emphasize this is an internal interface
interface INTERNAL_LowOverheadPictureSource {
	// if `i` is set this is the src of the image, otherwise this is the srcSet of the image.
	s: string;

	// Type of the picture source.
	t: PictureSource['type'];
}

interface Options {
	isDev: boolean;
	isServer: boolean;
}

const RESOURCE_QUERY_REGEX = /\?w=(?<width>\d+)\.scaled/;

// TODO: BLUUUR
const localStaticImageLoader: LoaderDefinitionFunction = async function localStaticImageLoader(this, contentNotRawType) {
	const content = contentNotRawType as unknown as Buffer;
	const options = this.getOptions() as Options;

	let userSpecifiedWidth: number | undefined = undefined;
	const matchedResourceQuery = this.resourceQuery.match(RESOURCE_QUERY_REGEX);
	if (matchedResourceQuery?.groups?.width) {
		userSpecifiedWidth = Number(matchedResourceQuery?.groups?.width);
	}

	const imageSpecificHash = hash(content, createHash);
	const imageFilename = path.basename(this.resourcePath);
	const imageInfo = readImageInfoFromBuffer(content);

	let { width, height } = imageInfo;
	if (userSpecifiedWidth) {
		// https://github.com/lovell/sharp/blob/7c631c0787915416e20a567a039516e99c81c42d/src/pipeline.cc#L176-L184
		const xFactor = imageInfo.width / userSpecifiedWidth;
		const targetHeight = Math.round(imageInfo.height / xFactor);

		width = userSpecifiedWidth;
		height = targetHeight;
	}

	if (imageInfo.type === 'svg') {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo);
		const importReturn: INTERNAL_LocalStaticImageImport = {
			contentHash: imageSpecificHash,
			filename: imageFilename,
			w: width,
			h: height,
			g: svgEntry.src,
		};
		const importReturnString = `export default ${JSON.stringify(importReturn)}`;

		// We are optimizing images only while building client.
		if (options.isServer) {
			return importReturnString;
		}

		const unsafeSvg = content.toString();
		// TODO: Fix, escape svg
		const safeSvg = unsafeSvg;

		const { data: optimizedSvg } = svgo.optimize(safeSvg, { multipass: true });
		this.emitFile(svgEntry.filepath, optimizedSvg);
	}

	const pictureSources = getImageSourcesNotSvg(imageFilename, imageSpecificHash, imageInfo, userSpecifiedWidth, 'static/media');
	const loPictureSources: INTERNAL_LowOverheadPictureSource[] = pictureSources.map((ps) => ({ s: ps.srcSetORsrc, t: ps.type }));

	const importReturn: INTERNAL_LocalStaticImageImport = {
		contentHash: imageSpecificHash,
		filename: imageFilename,
		i: !!userSpecifiedWidth,
		w: width,
		h: height,
		s: loPictureSources,
	};
	const importReturnString = `export default ${JSON.stringify(importReturn)}`;

	// We are optimizing images only while building client.
	if (options.isServer) {
		return importReturnString;
	}

	let imageOptimization = sharp(content, { animated: true, sequentialRead: true });

	// By default sharp strips all of the image metadata that includes the correct rotation.
	// To preserve the correct rotation *actually* rotate the image.
	imageOptimization = imageOptimization.rotate();

	const optimizationPromises: Promise<void>[] = [];
	for (const pictureSource of pictureSources) {
		for (const sharpEntry of pictureSource.__sharpEntries) {
			const optimizationPromise = (async () => {
				let localImageOptimization = imageOptimization.clone();
				localImageOptimization = localImageOptimization.resize({ width: sharpEntry.targetWidth }).toFormat(sharpEntry.targetFormat);
				const { data: optimizedImageBuffer, info } = await localImageOptimization.toBuffer({ resolveWithObject: true });
				if (userSpecifiedWidth && info.height !== height) {
					throw new Error(
						`THIS SHOULD NOT HAPPEN! The user specified the width of the image is ${userSpecifiedWidth} and the inferred hight is ${height}. BUT sharp thinks that the correct height should be ${info.height}. If you see this error contact the owner of this code and provide them with this error message.`,
					);
				}
				this.emitFile(sharpEntry.filepath, optimizedImageBuffer);
			})();
			optimizationPromises.push(optimizationPromise);
		}
	}

	await Promise.all(optimizationPromises);

	return importReturnString;
};

export const raw = true;
export default localStaticImageLoader;
