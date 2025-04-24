// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { BinaryLike, createHash as createHashType } from 'node:crypto';
import type SharpType from 'sharp';
import type SvgoType from 'svgo';

import { type ImageType, TARGET_IMAGE_FORMATS, TARGET_IMAGE_SIZES, getListOfScaledWidths } from './image.mjs';

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
	srcSet: string;
	fallbackSrc: string;
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

	// Must be unique per image
	cacheKey: string;
}

export interface UserSpecified {
	width?: number | number[];
	height?: number | number[];
}

export interface ImageSize {
	width: number;
	height: number;
}

export function validateUserSpecified(userSpecified: UserSpecified) {
	if (userSpecified.width && userSpecified.height) {
		throw new Error('You have specified both width and height. Only one is supported, the other one is inferred while kipping the image ratio.');
	}

	if (!(userSpecified.width || userSpecified.height)) {
		throw new Error('THIS SHOULD NOT HAPPEN. The UserSpecified object was passed without height and width.');
	}

	if (Array.isArray(userSpecified.width) && userSpecified.width.length < 2) {
		throw new Error(`User specified width array containing less than two items. Switch to the non-array syntax ${userSpecified.width}`);
	}

	if (Array.isArray(userSpecified.height) && userSpecified.height.length < 2) {
		throw new Error(`User specified height array containing less than two items. Switch to the non-array syntax ${userSpecified.height}`);
	}
}

const NEXTJS_IMAGE_FOLDER = '.next/static/media';
const NEXTJS_URL_PREFIX = '/_next/static/media';

function getImageFilenameMeta(imageFilename: string, imageSpecificHash: string) {
	return (width: number, format: ImageType) => `${imageFilename}.${imageSpecificHash}.${width.toString()}.${format}`;
}
function getImageUrlMeta(imageFilename: string, imageSpecificHash: string, baseURL: string = NEXTJS_URL_PREFIX) {
	return (width: number, format: ImageType) => encodeURI(`${baseURL}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`);
}
function getImageFilepathMeta(imageFilename: string, imageSpecificHash: string, baseFilePath: string) {
	return (width: number, format: ImageType) => `${baseFilePath}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
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

	const imageFormats = isDevelopmentMode ? [imageInfo.type] : TARGET_IMAGE_FORMATS;
	let targetWidths = [...TARGET_IMAGE_SIZES, imageInfo.width];

	if (userSpecified) {
		validateUserSpecified(userSpecified);
		const targetUserImageSizes = inferImageSizes(imageInfo, userSpecified);

		targetWidths = [imageInfo.width];
		for (const targeUserSize of targetUserImageSizes) {
			const scaledWidths = getListOfScaledWidths(targeUserSize.width);
			for (const width of scaledWidths) {
				targetWidths.push(width);
			}
		}
	}

	// Deduplicate and sort
	targetWidths = [...new Set(targetWidths)];
	targetWidths = targetWidths.sort((a, b) => b - a);

	if (userSpecified) {
		for (const targetWidth of targetWidths) {
			if (targetWidth > imageInfo.width) {
				console.log(
					`!WARNING! (<TOOO: DOCS LINK>) Image was requested with a heigher target width than original. Consider replacing the original image with a bigger version: ${imageFilename} Width: ${imageInfo.width} Requested width: ${targetWidth}`,
				);
			}
		}
	}

	if (isDevelopmentMode) {
		targetWidths = [imageInfo.width];
	}
	const sources: INTERNAL_PictureSource[] = [];
	for (const targetFormat of imageFormats) {
		let srcSetPerFormat = '';

		const sharpEntries: INTERNAL_SharpEntry[] = [];
		for (const targetWidth of targetWidths) {
			// Prevent upscaling.
			if (targetWidth > imageInfo.width) {
				continue;
			}

			srcSetPerFormat += `${getImageUrl(targetWidth, targetFormat)} ${targetWidth}w, `;
			sharpEntries.push({
				targetFormat: targetFormat,
				targetWidth: targetWidth,
				filepath: getImageFilepath(targetWidth, targetFormat),

				cacheKey: `${imageSpecificHash}.${targetWidth}.${targetFormat}`,
			});
		}

		// Remove the last ", "
		srcSetPerFormat = srcSetPerFormat.slice(0, srcSetPerFormat.length - 2);
		sources.push({
			srcSet: srcSetPerFormat,
			fallbackSrc: getImageUrl(sharpEntries[0].targetWidth, targetFormat),
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
	isDevelopmentMode: boolean,
	imageBuffer: Buffer,
	pictureSources: INTERNAL_PictureSource[],
	exportFunction: ExportFunction,
	getCacheFunction: GetCacheFunction,
	setCacheFunction: SetCacheFunction,
	sharp: typeof SharpType,
	imageFilenameToReport: string,
) {
	if (isDevelopmentMode) {
		if (pictureSources.length !== 1 || pictureSources[0].__sharpEntries.length !== 1) {
			throw new Error('Expected only one source and one sharpEntry while in the development mode.');
		}
		const theOnlySharpEntry = pictureSources[0].__sharpEntries[0];
		await exportFunction(imageBuffer, theOnlySharpEntry.filepath);
	}

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

				const localImageOptimizationFinal = imageOptimizationRotated
					.resize({
						width: sharpEntry.targetWidth,
						// Prevent issues with size inference.
						// https://github.com/lovell/sharp/issues/4353
						fastShrinkOnLoad: false,
					})
					.toFormat(sharpEntry.targetFormat);

				const { data: optimizedImageBuffer, info } = await localImageOptimizationFinal.toBuffer({
					resolveWithObject: true,
				});

				// ==================================================
				// ==================================================
				// Validate the inference function

				const imageMetadata = await imageOptimization.metadata();
				if (!(imageMetadata.width && imageMetadata.height)) {
					throw new Error('Sharp metadata resolved without width and height');
				}

				const imageSize = {
					width: imageMetadata.width,
					height: imageMetadata.height,
				};
				const { height: inferredHeight } = inferImageSize(imageSize, sharpEntry.targetWidth);
				if (inferredHeight !== info.height) {
					console.log(
						`!!WARNING!! The inference function is NOT working properly. Image of size ${JSON.stringify(imageSize)} and with target width of ${sharpEntry.targetWidth}. We inferred the height to be: ${inferredHeight} while sharp resized to ${JSON.stringify({ width: info.width, height: info.height })}. ${sharpEntry.filepath}`,
					);
				}

				// ==================================================
				// ==================================================

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

export function optimizeSvg(isDevelopmentMode: boolean, unsafeSvg: string, svgo: typeof SvgoType): string {
	// TODO: Fix, escape svg
	const safeSvg = unsafeSvg;
	if (isDevelopmentMode) {
		return safeSvg;
	}

	const { data: optimizedSvg } = svgo.optimize(safeSvg, { multipass: true });
	return optimizedSvg;
}

// https://github.com/lovell/sharp/blob/7c631c0787915416e20a567a039516e99c81c42d/src/pipeline.cc#L176-L184
//
// Follow the issue: https://github.com/lovell/sharp/issues/4353
function inferImageSize(currentSize: ImageSize, userSpecifiedWidth?: number, userSpecifiedHeight?: number): ImageSize {
	validateUserSpecified({
		width: userSpecifiedWidth,
		height: userSpecifiedHeight,
	});

	const newSize = { width: currentSize.width, height: currentSize.height };

	if (userSpecifiedWidth) {
		const ratio = currentSize.width / userSpecifiedWidth;
		const newHeightNotRounded = currentSize.height / ratio;
		const newHeight = Math.round(newHeightNotRounded);
		newSize.height = newHeight;
		newSize.width = userSpecifiedWidth;
	}

	if (userSpecifiedHeight) {
		const ratio = currentSize.height / userSpecifiedHeight;
		const newWidthNotRounded = currentSize.width / ratio;
		const newWidth = Math.round(newWidthNotRounded);
		newSize.width = newWidth;
		newSize.height = userSpecifiedHeight;
	}

	return newSize;
}

function inferImageSizes(currentSize: ImageSize, userSpecified: UserSpecified): ImageSize[] {
	validateUserSpecified(userSpecified);

	let userSpecifiedArray: number[] = [];
	let isWidthSpecified = false;
	if (userSpecified.width) {
		userSpecifiedArray = Array.isArray(userSpecified.width) ? userSpecified.width : [userSpecified.width];
		isWidthSpecified = true;
	}

	if (userSpecified.height) {
		userSpecifiedArray = Array.isArray(userSpecified.height) ? userSpecified.height : [userSpecified.height];
		isWidthSpecified = false;
	}

	const imageSizes: ImageSize[] = [];
	for (const specifiedSize of userSpecifiedArray) {
		const inferredSize = isWidthSpecified ? inferImageSize(currentSize, specifiedSize, undefined) : inferImageSize(currentSize, undefined, specifiedSize);
		imageSizes.push(inferredSize);
	}

	return imageSizes;
}

export interface CalculatedSize {
	imageSizeToSetAtTheImgElement: ImageSize;
	inferredSizes: string | undefined;
}

// So the conditions go like follows:
// IF the user did not specify anything we just set the size to the original size of the image
// IF the user specified only one width OR one height, we infer the other size and set that as width and height of the image & we set the sizes to the inferred width
// IF the user specified width array OR height array then we set the size to the original size of the image
export function calculateImageSizeFromUserSpecifiedNoSVG(imageInfo: ImageInfo, userSpecified: UserSpecified | undefined): CalculatedSize {
	if (userSpecified) {
		validateUserSpecified(userSpecified);
	}

	let imageSizeToSetAtTheImgElement: ImageSize = imageInfo;
	let inferredSizes: string | undefined;
	if (userSpecified && !Array.isArray(userSpecified.width) && !Array.isArray(userSpecified.height)) {
		imageSizeToSetAtTheImgElement = inferImageSize(imageInfo, userSpecified.width, userSpecified.height);
		inferredSizes = `${imageSizeToSetAtTheImgElement.width}px`;
	}

	return {
		imageSizeToSetAtTheImgElement: imageSizeToSetAtTheImgElement,
		inferredSizes: inferredSizes,
	};
}

// This function works this way because of the calculateImageSizeFromUserSpecified. Look at the rules above.
export function validateSizesProperty(userProvidedSizes: string | undefined, inferredSizes: string | undefined, imageNameToReport: string): string {
	if (userProvidedSizes && inferredSizes) {
		console.log(`!!WARNING!! You specified sizes, while it was possible to infer them. Are you sure you want to do that: ${imageNameToReport}`);
	}

	if (!(userProvidedSizes || inferredSizes)) {
		throw new Error(`Sizes can be omitted ONLY when specifying only ONE width OR height: ${imageNameToReport}`);
	}

	if (inferredSizes) {
		return inferredSizes;
	}

	if (userProvidedSizes) {
		if (userProvidedSizes === 'auto') {
			throw new Error(`The sizes='auto' attribute does not work in Safari and Firefox, sorry... ${imageNameToReport}`);
		}
		return userProvidedSizes;
	}

	throw new Error(`THIS SHOULD NOT HAPPEN: userProvidedSizes and inferredSizes were not cough in a condition: ${imageNameToReport}`);
}
