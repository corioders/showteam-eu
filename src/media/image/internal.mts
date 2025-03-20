import type { BinaryLike, createHash as createHashType } from 'node:crypto';
import type SharpType from 'sharp';
import type SvgoType from 'svgo';

import readImageInfoFromBufferInternal from 'buffer-image-size';
import { IMAGE_FORMATS, IMAGE_SIZES, type ImageType } from './image.mjs';

export function hash(data: BinaryLike, createHash: typeof createHashType): string {
	return createHash('shake256', { outputLength: 32 }).update(data).digest('hex');
}

export interface ImageInfo {
	width: number;
	height: number;
	type: ImageType;
}

export function readImageInfoFromBuffer(imageBuffer: Buffer): ImageInfo {
	return readImageInfoFromBufferInternal(imageBuffer) as ImageInfo;
}

export interface PictureSource {
	// If userSpecifiedWidth is set, only this width is generated
	srcSetORsrc: string;
	type: `image/${ImageType}`;
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface INTERNAL_PictureSource extends PictureSource {
	__sharpEntries: INTERNAL_SharpEntry[];
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface INTERNAL_SharpEntry {
	targetFormat: ImageType;
	targetWidth: number;
	filepath: string;
}

const NEXTJS_IMAGE_FOLDER = '.next/static/media';
const NEXTJS_URL_PREFIX = '/_next/static/media';

function getImageFilenameMeta(imageFilename: string, imageSpecificHash: string) {
	return (width: number, format: ImageType) => `${imageFilename}.${imageSpecificHash}.${width.toString()}.${format}`;
}
export function getImageUrlMeta(imageFilename: string, imageSpecificHash: string, baseURL: string = NEXTJS_URL_PREFIX) {
	return (width: number, format: ImageType) => encodeURI(`${baseURL}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`);
}
export function getImageFilepathMeta(imageFilename: string, imageSpecificHash: string, baseFilePath: string) {
	return (width: number, format: ImageType) => `${baseFilePath}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`;
}
export function getPictureSourcesNotSvg(
	isDevelopmentMode: boolean,
	imageFilename: string,
	imageSpecificHash: string,
	imageInfo: ImageInfo,
	baseFilePath: string,
	userSpecifiedWidth?: number,
	baseURL: string = NEXTJS_URL_PREFIX,
): INTERNAL_PictureSource[] {
	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	if (imageInfo.type === 'svg') {
		throw new Error('Svg image cannot be treated as a regular image');
	}

	const imageFormats = isDevelopmentMode ? [imageInfo.type] : IMAGE_FORMATS;
	if (userSpecifiedWidth) {
		if (userSpecifiedWidth > imageInfo.width) {
			throw new Error(`User specified width of ${userSpecifiedWidth}. This requires upscaling of the image. The original image has width of ${imageInfo.width}.`);
		}

		const sources: INTERNAL_PictureSource[] = [];
		for (const targetFormat of imageFormats) {
			sources.push({
				srcSetORsrc: getImageUrl(userSpecifiedWidth, targetFormat),
				type: `image/${targetFormat}`,

				__sharpEntries: [{ targetFormat: targetFormat, targetWidth: userSpecifiedWidth, filepath: getImageFilepath(userSpecifiedWidth, targetFormat) }],
			});
		}

		return sources;
	}

	const sources: INTERNAL_PictureSource[] = [];
	const targetWidths = isDevelopmentMode ? [imageInfo.width] : [...IMAGE_SIZES, imageInfo.width].sort((a, b) => a - b);
	for (const targetFormat of imageFormats) {
		let srcSetPerFormat = '';

		const sharpEntries: INTERNAL_SharpEntry[] = [];
		for (const targetWidth of targetWidths) {
			// Prevent upscaling.
			if (targetWidth > imageInfo.width) {
				continue;
			}

			// TODO: Figure out correct srcSet numbers. ${targetWidth}w,
			srcSetPerFormat += `${getImageUrl(targetWidth, targetFormat)} ${targetWidth}w, `;
			sharpEntries.push({ targetFormat: targetFormat, targetWidth: targetWidth, filepath: getImageFilepath(targetWidth, targetFormat) });
		}

		// Remove the last ", "
		srcSetPerFormat = srcSetPerFormat.slice(0, srcSetPerFormat.length - 2);
		sources.push({
			srcSetORsrc: srcSetPerFormat,
			type: `image/${targetFormat}`,
			__sharpEntries: sharpEntries,
		});
	}

	return sources;
}

export type ExportFunction = (optimizedImageBuffer: Buffer, filepath: string, targetImageInfo?: ImageInfo) => Promise<void>;
export type GetCacheFunction = (cacheKey: string) => Promise<Buffer | null>;
export type SetCacheFunction = (cacheKey: string, optimizedImageBuffer: Buffer) => Promise<void>;

export async function optimizePictureSources(
	imageBuffer: Buffer,
	pictureSources: INTERNAL_PictureSource[],
	exportFunction: ExportFunction,
	getCacheFunction: GetCacheFunction,
	setCacheFunction: SetCacheFunction,
	sharp: typeof SharpType,
) {
	let imageOptimization = sharp(imageBuffer, { animated: true, sequentialRead: true });

	// By default sharp strips all of the image metadata that includes the correct rotation.
	// To preserve the correct rotation *actually* rotate the image.
	imageOptimization = imageOptimization.rotate();

	const optimizationPromises: Promise<void>[] = [];
	for (const pictureSource of pictureSources) {
		for (const sharpEntry of pictureSource.__sharpEntries) {
			const optimizationPromise = (async () => {
				const cacheKey = sharpEntry.filepath;
				const cachedOptimizedImageBuffer = await getCacheFunction(cacheKey);
				if (cachedOptimizedImageBuffer) {
					await exportFunction(cachedOptimizedImageBuffer, sharpEntry.filepath);
					return
				}

				let localImageOptimization = imageOptimization.clone();
				localImageOptimization = localImageOptimization.resize({ width: sharpEntry.targetWidth }).toFormat(sharpEntry.targetFormat);
				const { data: optimizedImageBuffer, info } = await localImageOptimization.toBuffer({ resolveWithObject: true });

				await setCacheFunction(cacheKey, optimizedImageBuffer);
				await exportFunction(optimizedImageBuffer, sharpEntry.filepath, {
					width: info.width,
					height: info.height,
					type: sharpEntry.targetFormat,
				});
			})();
			optimizationPromises.push(optimizationPromise);
		}
	}

	await Promise.all(optimizationPromises);
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface INTERNAL_SVGEntry {
	src: string;
	filepath: string;
}

export function getSvgEntry(
	imageFilename: string,
	imageSpecificHash: string,
	imageInfo: ImageInfo,
	baseFilePath: string = NEXTJS_IMAGE_FOLDER,
	baseURL: string = NEXTJS_URL_PREFIX,
): INTERNAL_SVGEntry {
	if (imageInfo.type !== 'svg') {
		throw new Error('getSvgEntry works only for svg images');
	}

	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	// We can't depend on width. If the width changed the filename also changes and the browser invalidates the cache. Even tough only the js changed.
	const fakeWidth = 0;
	return {
		src: getImageUrl(fakeWidth, 'svg'),
		filepath: getImageFilepath(fakeWidth, 'svg'),
	};
}

export function optimizeSvg(unsafeSvg: string, svgo: typeof SvgoType): string {
	// TODO: Fix, escape svg
	const safeSvg = unsafeSvg;
	const { data: optimizedSvg } = svgo.optimize(safeSvg, { multipass: true });
	return optimizedSvg;
}

// https://github.com/lovell/sharp/blob/7c631c0787915416e20a567a039516e99c81c42d/src/pipeline.cc#L176-L184
export function inferHeight(currentWidth: number, currentHeight: number, newWidth: number): number {
	const xFactor = currentWidth / newWidth;
	const newHeight = Math.round(currentHeight / xFactor);

	return newHeight;
}
