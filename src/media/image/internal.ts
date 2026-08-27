// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

/** biome-ignore-all lint/style/useNamingConvention: This file does a lot of internal work. Some weird names are required */
import type { BinaryLike, createHash as createHashType } from "node:crypto";

import { type ErrorReturn, type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";
import type SharpType from "sharp";
import type * as SvgoType from "svgo";

import { CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER } from "@/const.js";

import type { OptimizedImageDescriptor, OptimizedImageFormat } from "./optimized-image.jsx";
import { PERFORMANCE_PLACEHOLDER } from "./performance-placeholder.js";
import { getTargetWidthsFromSizes } from "./sizes.js";

const MAX_DEV_IMAGE_PIXELS = 4096 * 4096;
const IMAGE_PIPELINE_VERSION = 3;
const TARGET_IMAGE_FORMATS: OptimizedImageFormat[] = ["avif", "webp"];

const AVIF_OPTIONS = { chromaSubsampling: "4:4:4", effort: 4, quality: 60 } as const;
const WEBP_OPTIONS = { effort: 4, quality: 80, smartSubsample: true } as const;
const FORBIDDEN_SVG_ELEMENTS = new Set(["animate", "animatemotion", "animatetransform", "discard", "embed", "foreignobject", "iframe", "object", "script", "set"]);
const SVG_URL_FUNCTION_REGEX = /url\(\s*(["']?)(?<reference>.*?)\1\s*\)/giu;
const UNSAFE_SVG_STYLE_REGEX = /(?:@import|expression\s*\(|-moz-binding|(?:data|file|https?|javascript)\s*:)/iu;

const IMAGE_PIPELINE_SIGNATURE = JSON.stringify({
	avif: AVIF_OPTIONS,
	version: IMAGE_PIPELINE_VERSION,
	webp: WEBP_OPTIONS,
});

type SourceImageFormat = "jpeg" | "png" | "webp" | "gif" | "avif" | "tiff" | "svg";

function shouldUsePerformancePlaceholder(isDevelopmentMode: boolean, imageInfo: ImageInfo): boolean {
	if (CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER()) {
		return false;
	}

	if (!isDevelopmentMode) {
		return false;
	}

	if (imageInfo.width * imageInfo.height <= MAX_DEV_IMAGE_PIXELS) {
		return false;
	}

	return true;
}

export function shouldOptimizeImages(): boolean {
	return process.env.NODE_ENV !== "development" && process.env["APP_ENV"] !== "preview";
}

export function hash(data: BinaryLike, createHash: typeof createHashType): string {
	return createHash("shake256", { outputLength: 32 }).update(data).digest("hex");
}

function getOptimizationHash(imageBuffer: Buffer, createHash: typeof createHashType): string {
	return hash(Buffer.concat([Buffer.from(IMAGE_PIPELINE_SIGNATURE), imageBuffer]), createHash);
}

export interface ImageInfo {
	width: number;
	height: number;
	type: SourceImageFormat;
	pages: number;

	imageSize: number;
}

export async function readImageInfoFromBuffer(imageBuffer: Buffer, sharp: typeof SharpType): ErrorReturnPromise<ImageInfo> {
	const imageSize = imageBuffer.length;
	const [imageMetadata, metadataError] = await safePromise(() => sharp(imageBuffer, { animated: true }).metadata());
	if (metadataError !== null) {
		return [null, metadataError];
	}

	const [type, typeError] = normalizeImageType(imageMetadata.format);
	if (typeError !== null) {
		return [null, typeError];
	}

	const pages = imageMetadata.pages ?? 1;
	let width = imageMetadata.autoOrient.width;
	let height = imageMetadata.autoOrient.height;
	if (pages > 1 && imageMetadata.pageHeight) {
		const orientationSwapsDimensions = imageMetadata.orientation !== undefined && imageMetadata.orientation >= 5 && imageMetadata.orientation <= 8;
		width = orientationSwapsDimensions ? imageMetadata.pageHeight : imageMetadata.width;
		height = orientationSwapsDimensions ? imageMetadata.width : imageMetadata.pageHeight;
	}

	if (!(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0)) {
		return [null, new Error(`Sharp returned invalid image dimensions: ${width}x${height}`)];
	}

	return [
		{
			height,
			imageSize,
			pages,
			type,
			width,
		},
		null,
	];
}

function normalizeImageType(format: string): ErrorReturn<SourceImageFormat> {
	if (format === "heif") {
		return ["avif", null];
	}

	if (["avif", "gif", "jpeg", "png", "svg", "tiff", "webp"].includes(format)) {
		return [format as SourceImageFormat, null];
	}

	return [null, new Error(`Unsupported image format: ${format}`)];
}

export interface PictureSource {
	srcSet: string;
	imgSrc: string;
	type: `image/${OptimizedImageFormat}`;
}

export interface INTERNAL_PictureSource extends PictureSource {
	__sharpEntries: INTERNAL_SharpEntry[];
}

export interface INTERNAL_SharpEntry {
	targetFormat: OptimizedImageFormat;
	targetWidth: number;
	filepath: string;

	// Must be unique per image
	cacheKey: string;
}

const DEFAULT_IMAGE_URL_PREFIX = "/_cstd/image";
const MAX_WEBP_DIMENSION = 16_383;

function getImageFilenameMeta(imageFilename: string, imageSpecificHash: string) {
	return (width: number, format: SourceImageFormat) => `${imageFilename}.${imageSpecificHash}.${width.toString()}.${format}`;
}
function getImageUrlMeta(imageFilename: string, imageSpecificHash: string, baseURL: string = DEFAULT_IMAGE_URL_PREFIX) {
	return (width: number, format: SourceImageFormat) => `${baseURL}/${encodeURIComponent(getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format))}`;
}
function getImageFilepathMeta(imageFilename: string, imageSpecificHash: string, baseFilePath: string) {
	return (width: number, format: SourceImageFormat) => `${baseFilePath}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`;
}

function isTargetImageSizeSupported(targetFormat: OptimizedImageFormat, imageInfo: ImageInfo, targetWidth: number): boolean {
	if (targetFormat !== "webp") {
		return true;
	}

	const targetHeight = Math.max(1, Math.round((imageInfo.height * targetWidth) / imageInfo.width));
	return targetWidth <= MAX_WEBP_DIMENSION && targetHeight <= MAX_WEBP_DIMENSION;
}

function getProductionFormats(imageInfo: ImageInfo): OptimizedImageFormat[] {
	return imageInfo.pages > 1 ? ["webp"] : TARGET_IMAGE_FORMATS;
}

export function getPictureSourcesNotSvg(
	isDevelopmentMode: boolean,
	imageFilenameArg: string,
	imageSpecificHashArg: string,
	imageInfo: ImageInfo,
	baseFilePath: string,
	requestedTargetWidths: readonly number[],
	baseURL: string = DEFAULT_IMAGE_URL_PREFIX,
): ErrorReturn<INTERNAL_PictureSource[]> {
	let imageFilename = imageFilenameArg;
	let imageSpecificHash = imageSpecificHashArg;
	const usePerformancePlaceholder = shouldUsePerformancePlaceholder(isDevelopmentMode, imageInfo);

	if (usePerformancePlaceholder) {
		imageFilename = "PERFORMANCE_PLACEHOLDER_";
		imageSpecificHash = `PERFORMANCE_PLACEHOLDER_V${IMAGE_PIPELINE_VERSION}_${imageInfo.width}_${imageInfo.height}`;
	}
	if (isDevelopmentMode) {
		imageSpecificHash = `development.${imageSpecificHash}`;
	}

	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	if (imageInfo.type === "svg") {
		return [null, new Error("SVG cannot be passed to the raster image planner.")];
	}

	let imageFormats: OptimizedImageFormat[] = isDevelopmentMode ? ["webp"] : getProductionFormats(imageInfo);
	let targetWidths = [...requestedTargetWidths];

	// Deduplicate and sort
	targetWidths = [...new Set(targetWidths)];
	targetWidths = targetWidths.sort((a, b) => b - a);

	if (isDevelopmentMode) {
		targetWidths = [imageInfo.width];
		if (usePerformancePlaceholder) {
			imageFormats = ["webp"];
		}
	}
	const sources: INTERNAL_PictureSource[] = [];
	for (const targetFormat of imageFormats) {
		let srcSetPerFormat = "";

		const sharpEntries: INTERNAL_SharpEntry[] = [];
		for (const targetWidth of targetWidths) {
			// Prevent upscaling.
			if (targetWidth > imageInfo.width) {
				continue;
			}

			if (!isTargetImageSizeSupported(targetFormat, imageInfo, targetWidth)) {
				console.log(
					`!WARNING! Skipping ${targetFormat} image because the target size exceeds the format limit: ${imageFilename} Original size: ${imageInfo.width}x${imageInfo.height} Requested width: ${targetWidth}`,
				);
				continue;
			}

			srcSetPerFormat += `${getImageUrl(targetWidth, targetFormat)} ${targetWidth}w, `;
			sharpEntries.push({
				cacheKey: `${imageSpecificHash}.${targetWidth}.${targetFormat}`,
				filepath: getImageFilepath(targetWidth, targetFormat),
				targetFormat: targetFormat,
				targetWidth: targetWidth,
			});
		}

		if (sharpEntries.length === 0) {
			continue;
		}

		// Remove the last ", "
		srcSetPerFormat = srcSetPerFormat.slice(0, srcSetPerFormat.length - 2);
		sources.push({
			__sharpEntries: sharpEntries,
			imgSrc: getImageUrl(sharpEntries[0].targetWidth, targetFormat),
			srcSet: srcSetPerFormat,
			type: `image/${targetFormat}`,
		});
	}

	return [sources, null];
}

export type ExportFunction = (optimizedImageBuffer: Buffer, filepath: string, targetImageInfo?: ImageInfo) => Promise<void>;
export type GetCacheFunction = (cacheKey: string) => Promise<Buffer | null>;
export type SetCacheFunction = (cacheKey: string, optimizedImageBuffer: Buffer) => Promise<void>;

export interface OptimizeImageBufferInternalOptions {
	baseFilePath: string;
	baseURL?: string;
	createHash: typeof createHashType;
	exportFile: ExportFunction;
	filename: string;
	getCache: GetCacheFunction;
	imageBuffer: Buffer;
	isDevelopmentMode: boolean;
	setCache: SetCacheFunction;
	sharp: typeof SharpType;
	sizes: string;
	svgo: typeof SvgoType;
}

/** The single optimizer used by static, remote and CMS image inputs. */
export async function optimizeImageBufferInternal(options: OptimizeImageBufferInternalOptions): ErrorReturnPromise<OptimizedImageDescriptor> {
	try {
		const [imageInfo, imageInfoError] = await readImageInfoFromBuffer(options.imageBuffer, options.sharp);
		if (imageInfoError !== null) {
			return [null, imageInfoError];
		}
		const contentHash = hash(options.imageBuffer, options.createHash);
		const optimizationHash = getOptimizationHash(options.imageBuffer, options.createHash);

		if (imageInfo.type === "svg") {
			const [svgEntry, svgEntryError] = getSvgEntry(options.filename, optimizationHash, imageInfo, options.baseFilePath, options.baseURL);
			if (svgEntryError !== null) {
				return [null, svgEntryError];
			}
			const optimizedSvg = optimizeSvg(options.isDevelopmentMode, options.imageBuffer.toString(), options.svgo);
			await options.exportFile(Buffer.from(optimizedSvg), svgEntry.filepath, imageInfo);
			return [{ contentHash, height: imageInfo.height, img: { src: svgEntry.src }, width: imageInfo.width }, null];
		}

		const [targetWidths, targetWidthsError] = getTargetWidthsFromSizes(options.sizes, imageInfo.width);
		if (targetWidthsError !== null) {
			return [null, targetWidthsError];
		}
		const [pictureSources, pictureSourcesError] = getPictureSourcesNotSvg(
			options.isDevelopmentMode,
			options.filename,
			optimizationHash,
			imageInfo,
			options.baseFilePath,
			targetWidths,
			options.baseURL,
		);
		if (pictureSourcesError !== null) {
			return [null, pictureSourcesError];
		}
		const [_, optimizationError] = await optimizePictureSources(
			options.isDevelopmentMode,
			options.imageBuffer,
			pictureSources,
			options.exportFile,
			options.getCache,
			options.setCache,
			options.sharp,
			options.filename,
		);
		if (optimizationError !== null) {
			return [null, optimizationError];
		}
		const imgSource = pictureSources.at(-1);
		if (!imgSource) {
			return [null, new Error(`Image optimization produced no sources: ${options.filename}`)];
		}

		return [
			{
				contentHash,
				height: imageInfo.height,
				img: { src: imgSource.imgSrc, srcSet: imgSource.srcSet },
				sources: pictureSources.slice(0, -1).map((source) => ({ srcSet: source.srcSet, type: source.type })),
				width: imageInfo.width,
			},
			null,
		];
	} catch (error) {
		return [null, error as Error];
	}
}

function reportTime(startTime: number, wasCacheHit: boolean, imageFilenameToReport: string) {
	let cacheHitMessage = "(cache miss)";
	if (wasCacheHit === true) {
		cacheHitMessage = " (cache hit)";
	}

	const endTime = Date.now();
	const timeItTook = Math.round((endTime - startTime) / 1000)
		.toString()
		// Just an arbitrary number
		.padEnd(3);
	console.log(`Optimizing image took ${timeItTook} seconds ${cacheHitMessage}: ${imageFilenameToReport}`);
}

function applyOutputFormat(image: ReturnType<typeof SharpType>, format: OptimizedImageFormat): ReturnType<typeof SharpType> {
	switch (format) {
		case "avif":
			return image.avif(AVIF_OPTIONS);
		case "webp":
			return image.webp(WEBP_OPTIONS);
	}
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
): ErrorReturnPromise<void> {
	try {
		const [sourceImageInfo, sourceImageInfoError] = await readImageInfoFromBuffer(imageBuffer, sharp);
		if (sourceImageInfoError !== null) {
			return [null, sourceImageInfoError];
		}

		if (isDevelopmentMode) {
			if (pictureSources.length !== 1 || pictureSources[0].__sharpEntries.length !== 1) {
				return [null, new Error("Development image optimization requires exactly one source and one output.")];
			}
			const theOnlySharpEntry = pictureSources[0].__sharpEntries[0];

			if (shouldUsePerformancePlaceholder(isDevelopmentMode, sourceImageInfo)) {
				const cacheKey = `PERFORMANCE_PLACEHOLDER_V${IMAGE_PIPELINE_VERSION}_${sourceImageInfo.width}_${sourceImageInfo.height}`;

				const cachedScaledPerformancePlaceholder = await getCacheFunction(cacheKey);
				if (cachedScaledPerformancePlaceholder) {
					await exportFunction(cachedScaledPerformancePlaceholder, theOnlySharpEntry.filepath);
					return [undefined, null];
				}

				const resizedPerformancePlaceholder = await sharp(PERFORMANCE_PLACEHOLDER)
					.resize({ height: sourceImageInfo.height, width: sourceImageInfo.width })
					.webp(WEBP_OPTIONS)
					.toBuffer();
				await setCacheFunction(cacheKey, resizedPerformancePlaceholder);
				await exportFunction(resizedPerformancePlaceholder, theOnlySharpEntry.filepath);
				return [undefined, null];
			}

			const developmentImage = await sharp(imageBuffer, { animated: true }).rotate().webp(WEBP_OPTIONS).toBuffer();
			await exportFunction(developmentImage, theOnlySharpEntry.filepath);
			return [undefined, null];
		}

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

				const resizedImage = imageOptimizationRotated.resize({
					// Prevent issues with size inference.
					// https://github.com/lovell/sharp/issues/4353
					fastShrinkOnLoad: false,
					width: sharpEntry.targetWidth,
				});
				const localImageOptimizationFinal = applyOutputFormat(resizedImage, sharpEntry.targetFormat);

				const { data: optimizedImageBuffer, info } = await localImageOptimizationFinal.toBuffer({
					resolveWithObject: true,
				});
				const outputHeight = info.pageHeight ?? info.height;

				await exportFunction(optimizedImageBuffer, sharpEntry.filepath, {
					height: outputHeight,
					imageSize: optimizedImageBuffer.length,
					pages: info.pages ?? 1,
					type: sharpEntry.targetFormat,
					width: info.width,
				});

				await setCacheFunction(cacheKey, optimizedImageBuffer);
			}
		}

		reportTime(startTime, wasCacheHit, imageFilenameToReport);
		return [undefined, null];
	} catch (error) {
		return [null, error as Error];
	}
}

export interface INTERNAL_SVGEntry {
	src: string;
	filepath: string;
}

export function getSvgEntry(
	imageFilename: string,
	imageSpecificHash: string,
	imageInfo: ImageInfo,
	baseFilePath: string,
	baseURL: string = DEFAULT_IMAGE_URL_PREFIX,
): ErrorReturn<INTERNAL_SVGEntry> {
	if (imageInfo.type !== "svg") {
		return [null, new Error("The SVG planner requires an SVG image.")];
	}

	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	// We can't depend on width. If the width changed the filename also changes and the browser invalidates the cache. Even tough only the js changed.
	const fakeWidth = 0;
	return [
		{
			filepath: getImageFilepath(fakeWidth, "svg"),
			src: getImageUrl(fakeWidth, "svg"),
		},
		null,
	];
}

const sanitizeSvgPlugin: SvgoType.CustomPlugin = {
	fn: (root) => sanitizeSvgChildren(root),
	name: "cstdSanitizeSvg",
};

function sanitizeSvgChildren(parentNode: SvgoType.XastParent): void {
	parentNode.children = parentNode.children.filter((childNode) => {
		if (childNode.type !== "element") {
			return true;
		}

		const elementName = childNode.name.split(":").at(-1)?.toLowerCase() ?? childNode.name.toLowerCase();
		if (FORBIDDEN_SVG_ELEMENTS.has(elementName)) {
			return false;
		}

		for (const [attributeName, attributeValue] of Object.entries(childNode.attributes)) {
			if (isUnsafeSvgAttribute(attributeName, attributeValue)) {
				delete childNode.attributes[attributeName];
			}
		}
		sanitizeSvgChildren(childNode);
		return true;
	});
}

function isUnsafeSvgAttribute(attributeName: string, attributeValue: string): boolean {
	const normalizedName = attributeName.toLowerCase();
	const normalizedValue = attributeValue.trim();
	if (normalizedName.startsWith("on") || normalizedName === "xml:base") {
		return true;
	}
	if (normalizedName === "href" || normalizedName.endsWith(":href") || normalizedName === "src") {
		return !normalizedValue.startsWith("#");
	}
	if (normalizedName === "style" && UNSAFE_SVG_STYLE_REGEX.test(normalizedValue)) {
		return true;
	}

	for (const urlMatch of normalizedValue.matchAll(SVG_URL_FUNCTION_REGEX)) {
		if (!urlMatch.groups?.reference.trim().startsWith("#")) {
			return true;
		}
	}
	return false;
}

export function optimizeSvg(isDevelopmentMode: boolean, unsafeSvg: string, svgo: typeof SvgoType): string {
	const plugins: SvgoType.Config["plugins"] = [sanitizeSvgPlugin, "removeScripts", "removeStyleElement", ...(isDevelopmentMode ? [] : (["preset-default"] as const))];
	const { data: optimizedSvg } = svgo.optimize(unsafeSvg, { multipass: !isDevelopmentMode, plugins });
	return optimizedSvg;
}
