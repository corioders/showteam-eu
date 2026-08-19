// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

/** biome-ignore-all lint/style/noCommonJs: RemoteStaticImage is designed to be able to run on edge. In rare cases this will function as a fallback */

import "server-only";

import "./../../../src/media/image/picture-display-style.css";

import type NodeFsType from "node:fs/promises";

import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";
import cacheDriver from "cstd-ts/storage/unstorage/cache-driver.mjs";
import { StatusCodes } from "http-status-codes";
import pLimit from "p-limit";
import type { ImgHTMLAttributes, JSX } from "react";
import type SharpType from "sharp";
import type * as SvgoType from "svgo";
import { Agent, fetch, type RequestInit, type Response } from "undici";
import { createStorage, type Storage as UnstorageStorage } from "unstorage";
import type UnstorageFsDriverType from "unstorage/drivers/fs-lite";
import lruCacheDriver from "unstorage/drivers/lru-cache";

import { CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER } from "@/const.js";

import { memoizeImages } from "./cache.js";
import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from "./image.mjs";
import {
	type CalculatedSize,
	calculateImageSizeFromUserSpecifiedNoSVG,
	getPictureSourcesNotSvg,
	getSvgEntry,
	hash,
	type ImageInfo,
	type INTERNAL_PictureSource,
	type INTERNAL_SVGEntry,
	optimizePictureSources,
	optimizeSvg,
	readImageInfoFromBuffer,
	shouldOptimizeImages,
	type UserSpecified,
	validateUserSpecified,
} from "./internal.mjs";
import { validateSizesProperty } from "./internal-client.mjs";

// 25 MiB
// const MAX_CLOUDFLARE_IMAGE_SIZE = 25 * 2 ** 20;

const FETCH_CONCURRENCY_LIMIT = 3;
const FETCH_RETRY = 3;
let NextjsFilepathPrefix = "./.next/static/media";

import nextPackageJson from "next/package.json";

const nextMajorVersion = Number(nextPackageJson.version.split(".")[0]);
if (nextMajorVersion >= 16 && process.env.NODE_ENV === "development") {
	NextjsFilepathPrefix = "./.next/dev/static/media";
}

// The cache should work regardless of the environment we are in:
// Dev-server: The cache is used while developing to prevent fetching the same images
// Pre-rendering: The cache is hit when we encounter the same image
// Production(edge / nodejs): While we cannot change the CND static assets
// we can fallback to responding with base64 encoded image. If we are on the node runtime the cache could provide some speedup.
interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: We are setting global state
	__CSTD_NEXT_IMAGES_CACHE?: UnstorageStorage;

	// biome-ignore lint/style/useNamingConvention: We are setting global state
	__CSTD_NEXT_IMAGES_DEV_CACHE?: Map<string, JSX.Element>;
}

const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE === undefined) {
	if (process.env["NEXT_IS_EXPORT_WORKER"] === "true" || process.env.NODE_ENV === "development") {
		const fsDriver: typeof UnstorageFsDriverType = require("unstorage/drivers/fs-lite");
		const HALF_GIGABYTE_IN_BYTES = 536_870_912;
		ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE = createStorage({
			driver: cacheDriver({
				cacheDriver: lruCacheDriver({ maxSize: HALF_GIGABYTE_IN_BYTES }),
				driver: fsDriver({ base: ".next/cache/corioders/cstd-next-remote-static-image" }),
			}),
		});
	} else {
		ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE = createStorage({ driver: lruCacheDriver({}) });
	}
}

if (ourGlobalThis.__CSTD_NEXT_IMAGES_DEV_CACHE === undefined) {
	ourGlobalThis.__CSTD_NEXT_IMAGES_DEV_CACHE = new Map();
}

const cacheStorage = ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE;

// TODO: Remove
const _devCache = ourGlobalThis.__CSTD_NEXT_IMAGES_DEV_CACHE;

// The height will be inferred form the width attribute (if any).
export interface RemoteStaticImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "sizes" | "width" | "height"> {
	src: string;
	alt: string;
	loading: "eager" | "lazy";
	sizes?: string;
	pictureClassName?: string;

	width?: number | number[];
	height?: number | number[];

	filename?: string;
	fetchRequestInit?: RequestInit;
}

/** 
DESIGN:
	Consideration. Do we make this component interplay with the LocalImage component?
	Props-wise when talking about props passed to the image we should.
	But the data structure of the src will be very different.
	For the local it would be something like: 
	export interface LocalImageProps {
		src: []{
			staticImageURL: string
			imageSize: {w: number, h: number}
			blurData: string ??
		}
	}
	This src data would be provided by our custom webpack image loader.


	I think these components are VASTLY different in what they want to achieve. Additionally, we will not pass image paths in the project,
	but rather the `imported local image` or the `url to remote image`
*/

// THIS COMPONENT WILL WORK ONLY ON STATIC ROUTES
// Executing this component outside the pre-rendering stage will NOT work.
//
// I mean, a fallback will trigger, but the fallback will not serve the optimized image.
//
// TODO: BLUR IMAGE DATA
export const RemoteStaticImage = function RemoteStaticImage(props: RemoteStaticImageProps) {
	return RemoteStaticImageMemorized(props, CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER());
};

const RemoteStaticImageMemorized = memoizeImages(async function RemoteStaticImageMemorized(
	props: RemoteStaticImageProps,
	_invalidateCacheOn_CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER_EnvChange: boolean,
) {
	const isDevelopmentMode = process.env["NODE_ENV"] === "development" || !shouldOptimizeImages();

	// Make sure that the src provided is a valid URL
	const imageURL = new URL(props.src);
	const imageFilename = convertToValidFilename(props.filename ?? props.alt);

	let userSpecified: UserSpecified | undefined = { height: props.height, width: props.width };
	if (!(props.width || props.height)) {
		userSpecified = undefined;
	}

	if (userSpecified) {
		validateUserSpecified(userSpecified);
	}

	const userImagePropsIncorrectType: Partial<RemoteStaticImageProps> = { ...props };

	delete userImagePropsIncorrectType.src;
	delete userImagePropsIncorrectType.alt;
	delete userImagePropsIncorrectType.loading;
	delete userImagePropsIncorrectType.sizes;
	delete userImagePropsIncorrectType.pictureClassName;

	delete userImagePropsIncorrectType.width;
	delete userImagePropsIncorrectType.height;

	delete userImagePropsIncorrectType.filename;
	delete userImagePropsIncorrectType.fetchRequestInit;

	const userImageProps = userImagePropsIncorrectType as ImgHTMLAttributes<HTMLImageElement>;

	const [fetchedImage, fetchError] = await fetchRemoteImage(imageURL, props.fetchRequestInit);
	if (fetchError !== null) {
		console.log(`Unable to fetch: ${fetchError}`);
		throw fetchError;
	}

	const imageBuffer = fetchedImage.imageBuffer;
	const imageInfo = fetchedImage.imageInfo;
	const isSVG = imageInfo.type === "svg";

	let calculatedSize: CalculatedSize | undefined;
	if (!isSVG) {
		calculatedSize = calculateImageSizeFromUserSpecifiedNoSVG(imageInfo, userSpecified);
	}

	const imageOptimizationAttributes = {
		...IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES,
		alt: props.alt,
		height: isSVG ? imageInfo.height : calculatedSize?.imageSizeToSetAtTheImgElement.height,
		loading: props.loading,

		width: isSVG ? imageInfo.width : calculatedSize?.imageSizeToSetAtTheImgElement.width,
	};

	// ==================================================
	// ==================================================
	// DYNAMIC ROUTE FALLBACK

	if (process.env["NEXT_IS_EXPORT_WORKER"] !== "true" && !isDevelopmentMode) {
		// Warn the user that they really should not be doing this
		// We are not in the pre-rendering phase. We have been called from a NON static route.
		// They are expecting us to optimize and save images while we are on the edge. When the static assets have already been deployed to a CND.
		// This is not how it work baby.
		console.log("!!WARNING!! You are trying to optimize images in a non-static route. This is not how it works. You should be doing this in the static route.");

		if (isSVG) {
			// This is the correct MIME type for svg
			imageInfo.type += "+xml";
		}

		const stringifiedBuffer = Buffer.from(imageBuffer).toString("base64");
		const imageBase64 = `data:image/${imageInfo.type};base64,${stringifiedBuffer}`;

		// Return the base64 version because we cannot add more images via fs.writeSync into the nextjs's static directory
		return (
			<picture className={props.pictureClassName}>
				<img {...imageOptimizationAttributes} {...userImageProps} alt={props.alt} src={imageBase64} />
			</picture>
		);
	}

	// ==================================================
	// ==================================================

	// We can use nodejs dependencies because this code will only be run during either buildtime or development time
	const nodeFs: typeof NodeFsType = require("node:fs/promises");

	// If two images are byte-byte the same, then they are the same image
	// for performance and SEO purposes it is more optimal to treat them as one image.
	const imageSpecificHash = hash(imageBuffer, require("node:crypto").createHash);

	await nodeFs.mkdir(NextjsFilepathPrefix, { recursive: true });

	if (isSVG) {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo, NextjsFilepathPrefix);
		await optimizeSvgAndWriteToDisk(isDevelopmentMode, svgEntry, imageBuffer);
		return (
			<picture className={props.pictureClassName}>
				<img {...imageOptimizationAttributes} {...userImageProps} alt={props.alt} src={svgEntry.src} />
			</picture>
		);
	}

	if (!calculatedSize) {
		throw new Error("calculatedSize should be defined at this point");
	}

	imageOptimizationAttributes.sizes = validateSizesProperty(props.sizes, calculatedSize.inferredSizes, imageFilename);

	const pictureSources = getPictureSourcesNotSvg(isDevelopmentMode, imageFilename, imageSpecificHash, imageInfo, NextjsFilepathPrefix, userSpecified);
	await optimizeImageAndWriteToDisk(isDevelopmentMode, pictureSources, imageBuffer, imageFilename);

	const sources: JSX.Element[] = [];
	for (const source of pictureSources) {
		const sourceKey = `${imageSpecificHash}${source.type}`;
		sources.push(<source key={sourceKey} sizes={imageOptimizationAttributes.sizes} src={source.fallbackSrc} srcSet={source.srcSet} type={source.type} />);
	}

	const defaultImageFallbackSource = pictureSources[0];
	return (
		<picture className={props.pictureClassName}>
			{sources}
			<img {...imageOptimizationAttributes} {...userImageProps} alt={props.alt} src={defaultImageFallbackSource.fallbackSrc} srcSet={defaultImageFallbackSource.srcSet} />
		</picture>
	);
});

interface FetchedImage {
	imageBuffer: Buffer;
	imageInfo: ImageInfo;
}

interface FetchRemoteImageCacheEntry {
	fetchedImage: FetchedImage;
	lastModified: string | null;
}

interface FetchRemoteImageMetadataCacheEntry {
	lastModified: FetchRemoteImageCacheEntry["lastModified"];
	imageInfo: FetchRemoteImageCacheEntry["fetchedImage"]["imageInfo"];
}

const FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY = (x: string) => `FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY:${x}`;
const FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY = (x: string) => `FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY:${x}`;

async function setFetchRemoteImageCache(cacheKey: string, entry: FetchRemoteImageCacheEntry | null): Promise<void> {
	const metadataCacheKey = FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY(cacheKey);
	const bufferCacheKey = FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY(cacheKey);

	if (!entry) {
		await cacheStorage.setItem(metadataCacheKey, null);
		await cacheStorage.setItemRaw(bufferCacheKey, null);
		return;
	}

	const p1 = cacheStorage.setItem<FetchRemoteImageMetadataCacheEntry>(metadataCacheKey, { imageInfo: entry.fetchedImage.imageInfo, lastModified: entry.lastModified });
	const p2 = cacheStorage.setItemRaw(bufferCacheKey, entry.fetchedImage.imageBuffer);
	await Promise.all([p1, p2]);
}

async function getFetchRemoteImageCache(cacheKey: string): Promise<FetchRemoteImageCacheEntry | null> {
	const metadataCacheKey = FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY(cacheKey);
	const bufferCacheKey = FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY(cacheKey);

	const metadata = await cacheStorage.getItem<FetchRemoteImageMetadataCacheEntry>(metadataCacheKey);
	if (!metadata) {
		return null;
	}

	const buffer = await cacheStorage.getItemRaw(bufferCacheKey);
	if (!buffer) {
		return null;
	}

	return {
		fetchedImage: {
			imageBuffer: buffer,
			imageInfo: metadata.imageInfo,
		},

		lastModified: metadata.lastModified,
	};
}

// async function fetchRemoteImageLastModified(imageURL: URL): Promise<string | null> {
// 	const [headImageResponse, headFetchError] = await safePromise(() => fetch(imageURL, { method: 'HEAD' }));
// 	if (headFetchError !== null) {
// 		return null;
// 	}

// 	if (!headImageResponse.ok || headImageResponse.status !== 200) {
// 		return null;
// 	}

// 	const lastModified = headImageResponse.headers.get('Last-Modified');
// 	return lastModified;
// }

async function fetchRemoteImage(imageURL: URL, fetchRequestInit?: RequestInit): ErrorReturnPromise<FetchedImage> {
	const sharp: typeof SharpType = requireWebpackExternalDependencyMakeWebpackNotBundleIt("sharp");

	let imageURLForLogging = imageURL.toString();
	if (isDataURI(imageURLForLogging)) {
		imageURLForLogging = "<DATA URI>";
	}
	// const currentLastModified = await fetchRemoteImageLastModified(imageURL);

	// TODO: FIX FIX FIX
	// When fetching with google drive, some images have the same data but different urls.... For example images in documents, and our system thinks
	// they are new and downloads them again. This has to be fixed
	const cacheKey = hash(imageURL.toString(), require("node:crypto").createHash);

	// During the build this cache would be used as a de-duplication mechanism.
	// If the same image would be requested in two routes.
	const cachedImage = await getFetchRemoteImageCache(cacheKey);
	if (cachedImage) {
		console.log(`Fetching remote image cache hit ${imageURLForLogging}`);
		// if (cachedImage.lastModified === currentLastModified || currentLastModified === null) {
		return [cachedImage.fetchedImage, null];
		// }

		// await setFetchRemoteImageCache(cacheKey, null);
	}

	const [imageResponse, fetchError] = await fetchWithRetry(imageURL, fetchRequestInit);
	if (fetchError !== null) {
		console.log(`FetchRemoteImage, fetch failed with error: ${fetchError}`);
		const error = new Error(`Error while fetching image ${imageURLForLogging} response was: ${imageResponse}\n\nThe error was ${fetchError}`, { cause: fetchError });
		return [null, error];
	}

	console.log(`Fetched remote image ${imageURLForLogging}`);

	if (!imageResponse.ok || imageResponse.status !== StatusCodes.OK) {
		return [null, new Error(`Unable to fetch image ${imageResponse.statusText}`)];
	}

	const lastModified = imageResponse.headers.get("Last-Modified");
	const [imageArrayBuffer, imageArrayBufferError] = await safePromise(() => imageResponse.arrayBuffer());
	if (imageArrayBufferError !== null) {
		return [null, imageArrayBufferError];
	}

	const imageBuffer = Buffer.from(imageArrayBuffer);
	const imageInfo = await readImageInfoFromBuffer(imageBuffer, sharp);

	const fetchedImage: FetchedImage = {
		imageBuffer,
		imageInfo,
	};

	await setFetchRemoteImageCache(cacheKey, { fetchedImage, lastModified });
	return [fetchedImage, null];
}

const OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY = (x: string) => `OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY:${x}`;

async function optimizeSvgAndWriteToDisk(isDevelopmentMode: boolean, svgEntry: INTERNAL_SVGEntry, imageBuffer: Buffer): Promise<void> {
	const svgo: typeof SvgoType = requireWebpackExternalDependencyMakeWebpackNotBundleIt("svgo");
	const nodeFs: typeof NodeFsType = require("node:fs/promises");

	if (isDevelopmentMode) {
		await nodeFs.writeFile(svgEntry.filepath, imageBuffer.toString());
	}

	const cacheKey = OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY(svgEntry.filepath);
	let optimizedSvg = await cacheStorage.getItem<string>(cacheKey);
	if (optimizedSvg === null) {
		optimizedSvg = optimizeSvg(false, imageBuffer.toString(), svgo);
		await cacheStorage.setItem(cacheKey, optimizedSvg);
	}

	const [_, statsError] = await safePromise(() => nodeFs.stat(svgEntry.filepath));
	const exists = statsError === null;
	if (exists) {
		return;
	}

	await nodeFs.writeFile(svgEntry.filepath, optimizedSvg);
}

const OPTIMIZE_REMOTE_IMAGE_CACHE_KEY = (x: string) => `OPTIMIZE_REMOTE_IMAGE_CACHE_KEY:${x}`;

async function optimizeImageAndWriteToDisk(
	isDevelopmentMode: boolean,
	pictureSources: INTERNAL_PictureSource[],
	imageBuffer: Buffer,
	imageFilenameToReport: string,
): Promise<void> {
	const sharp: typeof SharpType = requireWebpackExternalDependencyMakeWebpackNotBundleIt("sharp");
	const nodeFs: typeof NodeFsType = require("node:fs/promises");

	const exportFunction = async (optimizedImageBuffer: Buffer, filepath: string) => {
		const [_, statsError] = await safePromise(() => nodeFs.stat(filepath));
		const exists = statsError === null;
		if (exists) {
			return;
		}

		await nodeFs.writeFile(filepath, optimizedImageBuffer);
	};

	const getCacheFunction = async (cacheKey: string): Promise<Buffer | null> => {
		const localCacheKey = OPTIMIZE_REMOTE_IMAGE_CACHE_KEY(cacheKey);
		return await cacheStorage.getItemRaw<Buffer>(localCacheKey);
	};

	const setCacheFunction = async (cacheKey: string, optimizedImageBuffer: Buffer): Promise<void> => {
		const localCacheKey = OPTIMIZE_REMOTE_IMAGE_CACHE_KEY(cacheKey);
		await cacheStorage.setItemRaw(localCacheKey, optimizedImageBuffer);
	};

	await optimizePictureSources(isDevelopmentMode, imageBuffer, pictureSources, exportFunction, getCacheFunction, setCacheFunction, sharp, imageFilenameToReport);
}

function requireWebpackExternalDependencyMakeWebpackNotBundleIt(id: string): any {
	// biome-ignore lint/security/noGlobalEval: this is a hack for webpack, we need it
	// biome-ignore lint/style/useNamingConvention: this is a hacky function. We want it to be very verbose
	const originalNodejsRequire__NotAffectedByWebpackBuild = eval("require") as typeof require;
	return originalNodejsRequire__NotAffectedByWebpackBuild(id);
}

function convertToValidFilename(x: string): string {
	return x.replaceAll(/[/|\\:*?"<>]/g, " ").replaceAll("\n", " ");
}

function isDataURI(uri: string): boolean {
	return uri.startsWith("data:");
}

const fetchConcurrencyLimit = pLimit(FETCH_CONCURRENCY_LIMIT);

async function fetchWithRetry(imageURL: URL, fetchRequestInit?: RequestInit): ErrorReturnPromise<Response> {
	let fetchTry = 0;
	while (true) {
		fetchTry += 1;

		const millisecond = 1;
		const second = millisecond * 1000;
		const minute = second * 60;
		const hour = minute * 60;
		const [imageResponse, fetchError] = await fetchConcurrencyLimit(() =>
			safePromise(() =>
				fetch(imageURL, {
					dispatcher: new Agent({ connectTimeout: hour }),
					signal: AbortSignal.timeout(hour),
					...fetchRequestInit,
				}),
			),
		);
		if (fetchError === null) {
			return [imageResponse, null];
		}

		console.log(`Fetching remote image retry ${fetchTry}`);

		if (fetchTry >= FETCH_RETRY) {
			return [null, fetchError];
		}
	}
}
