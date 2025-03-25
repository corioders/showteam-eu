// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { BinaryLike, createHash as createHashType } from 'node:crypto';
import type SharpType from 'sharp';
import type SvgoType from 'svgo';

import { IMAGE_FORMATS, IMAGE_SIZES, type ImageType } from './image.mjs';

// TODO: Check if buffer-image-size works in the browser
import readImageInfoFromBufferInternal from 'buffer-image-size';

// Importing p-limit works on browser.
import pLimit from 'p-limit';

const SKIP_IMAGE_OPTIMIZATION_FLAG = 'CORIODERS_SKIP_IMAGE_OPTIMIZATION';
const FORCE_IMAGE_OPTIMIZATION_FLAG = 'CORIODERS_FORCE_IMAGE_OPTIMIZATION';

export function shouldOptimizeImages(): boolean {
	if (process.env[FORCE_IMAGE_OPTIMIZATION_FLAG]) {
		return true;
	}

	if (process.env[SKIP_IMAGE_OPTIMIZATION_FLAG]) {
		return false;
	}

	return true;
}

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
	targetSizeScaled: number;
	targetSizeIsWidth: boolean;
	filepath: string;

	// Must be unique per image
	cacheKey: string;
}

export interface UserSpecified {
	width?: number;
	height?: number;
}

export interface ImageSize {
	width: number;
	height: number;
}

function validateUserSpecified(userSpecified: UserSpecified) {
	if (userSpecified.width && userSpecified.height) {
		throw new Error('You have specified both width and height. Only one is supported, the other one is inferred while kipping the image ratio.');
	}

	if (!(userSpecified.width || userSpecified.height)) {
		throw new Error('THIS SHOULD NOT HAPPEN. The UserSpecified object was passed without height and width.');
	}
}

// This function scaled the size by a factor so that the image presents itself as the original
// size but in reality it's *factor bigger. This results in higher quality images.
function getScaledWidthOrHeight(widthOrHeight: number): number {
	return widthOrHeight * 2;
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
	userSpecified?: UserSpecified,
	baseURL: string = NEXTJS_URL_PREFIX,
): INTERNAL_PictureSource[] {
	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	if (imageInfo.type === 'svg') {
		throw new Error('Svg image cannot be treated as a regular image');
	}

	const imageFormats = isDevelopmentMode ? [imageInfo.type] : IMAGE_FORMATS;
	if (userSpecified) {
		validateUserSpecified(userSpecified);
		const inferredDimensions = inferDimensions(imageInfo, userSpecified);

		if (getScaledWidthOrHeight(inferredDimensions.width) > imageInfo.width || getScaledWidthOrHeight(inferredDimensions.height) > imageInfo.height) {
			console.log(
				`WARNING ${imageFilename}: The user specified width or height is too big for the image. The minimal image size should be ${getScaledWidthOrHeight(inferredDimensions.width)}x${getScaledWidthOrHeight(inferredDimensions.height)}. This image will be upscaled by the browser.`,
			);
		}

		let targetSize = undefined;
		let targetSizeIsWidth = true;
		if (userSpecified.width) {
			targetSize = getScaledWidthOrHeight(userSpecified.width);
			targetSizeIsWidth = true;
			if (targetSize > imageInfo.width) {
				targetSize = imageInfo.width;
			}
		}
		if (userSpecified.height) {
			targetSize = getScaledWidthOrHeight(userSpecified.height);
			targetSizeIsWidth = false;
			if (targetSize > imageInfo.height) {
				targetSize = imageInfo.width;
				targetSizeIsWidth = true;
			}
		}

		if (!targetSize) {
			throw new Error(`THIS SHOULD NOT HAPPENED: User did not specify either width or height but we still ended up here. ${userSpecified}`);
		}

		const sources: INTERNAL_PictureSource[] = [];
		for (const targetFormat of imageFormats) {
			sources.push({
				srcSetORsrc: getImageUrl(inferredDimensions.width, targetFormat),
				type: `image/${targetFormat}`,

				__sharpEntries: [
					{
						targetFormat: targetFormat,
						targetSizeScaled: targetSize,
						targetSizeIsWidth,
						filepath: getImageFilepath(inferredDimensions.width, targetFormat),

						cacheKey: `${imageSpecificHash}.${inferredDimensions.width}.${targetFormat}`,
					},
				],
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
			sharpEntries.push({
				targetFormat: targetFormat,
				targetSizeScaled: targetWidth,
				targetSizeIsWidth: true,
				filepath: getImageFilepath(targetWidth, targetFormat),

				cacheKey: `${imageSpecificHash}.${targetWidth}.${targetFormat}`,
			});
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

const CONCURRENCY_LIMIT = 1;
const concurrencyLimit = pLimit(CONCURRENCY_LIMIT);

function reportTime(startTime: number, wasCacheHit: boolean, imageFilenameToReport: string) {
	let cacheHitMessage = '(cache miss)';
	if (wasCacheHit === true) {
		cacheHitMessage = ' (cache hit)';
	}

	const endTime = Date.now();
	const timeItTook = Math.round((endTime - startTime) / 1000)
		.toString()
		.padEnd(3);
	console.log(`Optimizing image took ${timeItTook} seconds ${cacheHitMessage}: ${imageFilenameToReport}`);
}

export async function optimizePictureSources(
	imageBuffer: Buffer,
	pictureSources: INTERNAL_PictureSource[],
	exportFunction: ExportFunction,
	getCacheFunction: GetCacheFunction,
	setCacheFunction: SetCacheFunction,
	sharp: typeof SharpType,
	imageFilenameToReport: string,
) {
	// Include an internal concurrency limit so that we are optimizing one image at the time.
	//
	// When using cloudflare, running more than one sharp instance at once usually causes segfaults.
	await concurrencyLimit(async () => {
		const startTime = Date.now();
		let wasCacheHit = false;

		for (const pictureSource of pictureSources) {
			for (const sharpEntry of pictureSource.__sharpEntries) {
				const cacheKey = sharpEntry.cacheKey;
				const cachedOptimizedImageBuffer = await getCacheFunction(cacheKey);
				if (cachedOptimizedImageBuffer) {
					await exportFunction(cachedOptimizedImageBuffer, sharpEntry.filepath);
					wasCacheHit = true;
					continue;
				}

				const imageOptimization = sharp(imageBuffer, {
					animated: true,
					sequentialRead: true,
				});

				// By default sharp strips all of the image metadata that includes the correct rotation.
				// To preserve the correct rotation *actually* rotate the image.
				const imageOptimizationRotated = imageOptimization.rotate();

				const resizeOptions = sharpEntry.targetSizeIsWidth ? { width: sharpEntry.targetSizeScaled } : { height: sharpEntry.targetSizeScaled };

				const localImageOptimizationFinal = imageOptimizationRotated.resize(resizeOptions).toFormat(sharpEntry.targetFormat);
				const { data: optimizedImageBuffer, info } = await localImageOptimizationFinal.toBuffer({
					resolveWithObject: true,
				});

				await exportFunction(optimizedImageBuffer, sharpEntry.filepath, {
					width: info.width,
					height: info.height,
					type: sharpEntry.targetFormat,
				});

				await setCacheFunction(cacheKey, optimizedImageBuffer);
			}
		}

		reportTime(startTime, wasCacheHit, imageFilenameToReport);
	});
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
//
// Follow the issue: https://github.com/lovell/sharp/issues/4353
export function inferDimensions(currentSize: ImageSize, userSpecified: UserSpecified): ImageSize {
	validateUserSpecified(userSpecified);

	const newSize = { width: currentSize.width, height: currentSize.height };

	if (userSpecified.width) {
		const ratio = currentSize.width / userSpecified.width;
		const newHeightNotRounded = currentSize.height / ratio;
		const newHeight = Math.round(newHeightNotRounded);
		newSize.height = newHeight;
		newSize.width = userSpecified.width;
	}

	if (userSpecified.height) {
		const ratio = currentSize.height / userSpecified.height;
		const newWidthNotRounded = currentSize.width / ratio;
		const newWidth = Math.round(newWidthNotRounded);
		newSize.width = newWidth;
		newSize.height = userSpecified.height;
	}

	return newSize;
}

export interface UserSpecifiedInferenceCheck {
	userSpecified?: UserSpecified;
	inferredSize?: ImageSize;
}

// Make this function throw when we get a good replay: https://github.com/lovell/sharp/issues/4353
export function validateInferredWidth(userSpecifiedIC: UserSpecifiedInferenceCheck, actualSize: ImageSize) {
	if (!(userSpecifiedIC.userSpecified && userSpecifiedIC.inferredSize)) {
		return;
	}
	validateUserSpecified(userSpecifiedIC.userSpecified);

	if (userSpecifiedIC.userSpecified.width) {
		if (userSpecifiedIC.inferredSize.height === actualSize.height) {
			return;
		}
	}

	if (userSpecifiedIC.userSpecified.height) {
		if (userSpecifiedIC.inferredSize.width === actualSize.height) {
			return;
		}
	}

	const errorMessage = `THIS SHOULD NOT HAPPEN! The user specified ${JSON.stringify(userSpecifiedIC.userSpecified)} and the inferred is ${JSON.stringify(userSpecifiedIC.inferredSize)}, but sharp thinks the size should be ${JSON.stringify(actualSize)}. If you see this error contact the owner of this code and provide them with this error message.`;
	console.log(errorMessage);
	// throw new Error(errorMessage);
}
