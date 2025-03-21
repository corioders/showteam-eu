// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { createHash } from 'node:crypto';
import path from 'node:path';
import pLimit from 'p-limit';
import sharp from 'sharp';
import svgo from 'svgo';
import { createStorage } from 'unstorage';
import type { LoaderDefinitionFunction } from 'webpack';
import {
	type ImageInfo,
	type PictureSource,
	getPictureSourcesNotSvg,
	getSvgEntry,
	hash,
	inferHeight,
	optimizePictureSources,
	optimizeSvg,
	readImageInfoFromBuffer,
} from '../internal.mjs';

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
import fsDriver from 'unstorage/drivers/fs-lite';

const cache = createStorage({ driver: fsDriver({ base: '.next/cache/cstd-next-local-static-image' }) });
interface Options {
	isDev: boolean;
	isServer: boolean;
}

const RESOURCE_QUERY_REGEX = /\?w=(?<width>\d+)\.scaled/;
const NEXTJS_FILEPATH_PREFIX = 'static/media';
const OPTIMIZE_IMAGES_ENV_FLAG = 'CORIODERS_OPTIMIZE_IMAGES';

const CONCURRENCY_LIMIT = 1;
const concurrencyLimit = pLimit(CONCURRENCY_LIMIT);

// TODO: BLUUUR
const localStaticImageLoader: LoaderDefinitionFunction = async function localStaticImageLoader(this, contentNotRawType) {
	this.cacheable(true);

	const imageBuffer = contentNotRawType as unknown as Buffer;
	const options = this.getOptions() as Options;
	const isDevelopmentMode = options.isDev || (process.env[OPTIMIZE_IMAGES_ENV_FLAG] === 'false' && process.env['IS_CLOUDFLARE'] !== 'true');

	let userSpecifiedWidth: number | undefined = undefined;
	const matchedResourceQuery = this.resourceQuery.match(RESOURCE_QUERY_REGEX);
	if (matchedResourceQuery?.groups?.width) {
		userSpecifiedWidth = Number(matchedResourceQuery?.groups?.width);
	}

	const imageSpecificHash = hash(imageBuffer, createHash);
	const imageFilename = path.basename(this.resourcePath);
	const imageInfo = readImageInfoFromBuffer(imageBuffer);
	let startTime = Date.now();
	const reportTime = (wasCacheHit?: boolean) => {
		let cacheHitMessage = '(cache miss)';
		if (wasCacheHit === true) {
			cacheHitMessage = ' (cache hit)';
		}

		const endTime = Date.now();
		const timeItTook = Math.round((endTime - startTime) / 1000)
			.toString()
			.padEnd(3);
		console.log(`Optimizing image took ${timeItTook} seconds ${cacheHitMessage}: ${imageFilename}`);
	};

	let { width, height } = imageInfo;
	if (userSpecifiedWidth) {
		width = userSpecifiedWidth;
		height = inferHeight(width, height, userSpecifiedWidth);
	}

	if (imageInfo.type === 'svg') {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo, NEXTJS_FILEPATH_PREFIX);
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

		// Skip optimization in development mode
		if (isDevelopmentMode) {
			this.emitFile(svgEntry.filepath, imageBuffer);
			return importReturnString;
		}

		const optimizedSvg = optimizeSvg(imageBuffer.toString(), svgo);
		reportTime();

		this.emitFile(svgEntry.filepath, optimizedSvg);

		return importReturnString;
	}

	const pictureSources = getPictureSourcesNotSvg(isDevelopmentMode, imageFilename, imageSpecificHash, imageInfo, NEXTJS_FILEPATH_PREFIX, userSpecifiedWidth);
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

	// TODO: Figure out if we'd like to rescale the images as the user requested in the ?w query.
	if (isDevelopmentMode) {
		if (pictureSources.length !== 1 || pictureSources[0].__sharpEntries.length !== 1) {
			throw new Error('Expected only one source and one sharpEntry while in the development mode.');
		}

		const theOnlySharpEntry = pictureSources[0].__sharpEntries[0];
		this.emitFile(theOnlySharpEntry.filepath, imageBuffer);
		return importReturnString;
	}

	return await concurrencyLimit(async () => {
		// We are queuing the requests. We do not want to count this queueing time.
		startTime = Date.now();

		const exportFunction = (optimizedImageBuffer: Buffer, filepath: string, targetImageInfo?: ImageInfo) => {
			if (userSpecifiedWidth && targetImageInfo && targetImageInfo.height !== height) {
				throw new Error(
					`THIS SHOULD NOT HAPPEN! The user specified the width of the image is ${userSpecifiedWidth} and the inferred hight is ${height}. BUT sharp thinks that the correct height should be ${targetImageInfo.height}. If you see this error contact the owner of this code and provide them with this error message.`,
				);
			}

			this.emitFile(filepath, optimizedImageBuffer);
			return Promise.resolve();
		};

		let wasThereACacheHit = false;
		const getCacheFunction = async (cacheKey: string) => {
			const optimizedImageBuffer = await cache.getItemRaw<Buffer>(cacheKey);
			if (optimizedImageBuffer) {
				wasThereACacheHit = true;
			}
			return optimizedImageBuffer;
		};

		const setCacheFunction = async (cacheKey: string, optimizedImageBuffer: Buffer) => {
			await cache.setItemRaw(cacheKey, optimizedImageBuffer);
		};

		await optimizePictureSources(imageBuffer, pictureSources, exportFunction, getCacheFunction, setCacheFunction, sharp);
		reportTime(wasThereACacheHit);

		return importReturnString;
	});
};

export const raw = true;
export default localStaticImageLoader;
