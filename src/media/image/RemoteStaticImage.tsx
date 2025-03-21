// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import 'server-only';

import './../../../src/media/image/picture-display-style.css';

import type NodeFsType from 'node:fs/promises';
import type SharpType from 'sharp';
import type SvgoType from 'svgo';
import type UnstorageFsDriverType from 'unstorage/drivers/fs-lite';

import { type ErrorReturnPromise, safePromise } from 'cstd-ts/error/index.js';
import cacheDriver from 'cstd-ts/storage/unstorage/cacheDriver.mjs';
import type { ImgHTMLAttributes, JSX } from 'react';
import { Agent, type RequestInit, fetch } from 'undici';
import { type Storage as UnstorageStorage, createStorage } from 'unstorage';
import lruCacheDriver from 'unstorage/drivers/lru-cache';
import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from './image.mjs';
import {
	type INTERNAL_PictureSource,
	type INTERNAL_SVGEntry,
	type ImageInfo,
	getImageFilepathMeta,
	getImageUrlMeta,
	getPictureSourcesNotSvg,
	getSvgEntry,
	hash,
	inferHeight,
	optimizePictureSources,
	optimizeSvg,
	readImageInfoFromBuffer,
} from './internal.mjs';

// 25 MiB
const MAX_CLOUDFLARE_IMAGE_SIZE = 25 * 2 ** 20;

const NEXTJS_FILEPATH_PREFIX = './.next/static/media';

// The cache should work regardless of the environment we are in:
// Dev-server: The cache is used while developing to prevent fetching the same images
// Pre-rendering: The cache is hit when we encounter the same image
// Production(edge / nodejs): While we cannot change the CND static assets
// we can fallback to responding with base64 encoded image. If we are on the node runtime the cache could provide some speedup.
interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: This is a readonly thing.
	__CSTD_NEXT_IMAGES_CACHE?: UnstorageStorage;

	// biome-ignore lint/style/useNamingConvention: Same as above
	__CSTD_NEXT_IMAGES_DEV_CACHE?: Map<string, JSX.Element>;
}

const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE === undefined) {
	if (process.env['NEXT_IS_EXPORT_WORKER'] === 'true' || process.env.NODE_ENV === 'development') {
		const fsDriver: typeof UnstorageFsDriverType = require('unstorage/drivers/fs-lite');
		ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE = createStorage({
			driver: cacheDriver({ driver: fsDriver({ base: '.next/cache/cstd-next-remote-static-image' }) }),
		});
	} else {
		ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE = createStorage({ driver: lruCacheDriver(undefined) });
	}
}

if (ourGlobalThis.__CSTD_NEXT_IMAGES_DEV_CACHE === undefined) {
	ourGlobalThis.__CSTD_NEXT_IMAGES_DEV_CACHE = new Map();
}

const cacheStorage = ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE;
const devCache = ourGlobalThis.__CSTD_NEXT_IMAGES_DEV_CACHE;

// The height will be inferred form the width attribute (if any).
export interface RemoteImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'height'> {
	src: string;
	alt: string;
	width?: number;
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
// TODO: Limit concurrency
export default async function RemoteStaticImage(props: RemoteImageProps) {
	const devCacheKey = JSON.stringify(props);
	if (process.env.NODE_ENV === 'development') {
		const cacheEntry = devCache.get(devCacheKey);
		if (cacheEntry) {
			return cacheEntry;
		}
	}

	// Make sure that the src provided is a valid URL
	const imageURL = new URL(props.src);
	const imageFilename = convertToValidFilename(props.filename ?? props.alt);
	const userSpecifiedWidth = props.width;
	const isDevelopment = process.env.NODE_ENV === 'development';

	const rawImageProps: Partial<RemoteImageProps> = { ...props };

	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.src;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.alt;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.filename;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.width;

	const [fetchedImage, fetchError] = await fetchRemoteImage(imageURL, props.fetchRequestInit);
	if (fetchError !== null) {
		console.log(`Unable to fetch: ${fetchError}`);
		throw fetchError;
	}

	const imageBuffer = fetchedImage.imageBuffer;
	const imageInfo = fetchedImage.imageInfo;

	let { width, height } = imageInfo;
	if (userSpecifiedWidth) {
		width = userSpecifiedWidth;
		height = inferHeight(width, height, userSpecifiedWidth);
	}

	const imageOptimizationAttributes = {
		...IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES,
		// TODO: Figure out correct sizes
		sizes: '100vw',
		width: width,
		height: height,
	};

	if (process.env['NEXT_IS_EXPORT_WORKER'] !== 'true' && !isDevelopment) {
		// Warn the user that they really should not be doing this
		// We are not in the pre-rendering phase. We have been called from a NON static route.
		// They are expecting us to optimize and save images while we are on the edge. When the static assets have already been deployed to a CND.
		// This is not how it work baby.
		console.log('!!WARNING!! You are trying to optimize images in a non-static route. This is not how it works. You should be doing this in the static route.');

		if (imageInfo.type === 'svg') {
			// This is the correct MIME type for svg
			imageInfo.type += '+xml';
		}

		const stringifiedBuffer = Buffer.from(imageBuffer).toString('base64');
		const imageBase64 = `data:image/${imageInfo.type};base64,${stringifiedBuffer}`;

		// Return the base64 version because we cannot add more images via fs.writeSync into the nextjs's static directory
		return <img {...imageOptimizationAttributes} {...rawImageProps} src={imageBase64} alt={props.alt} />;
	}

	// We can use nodejs dependencies because this code will only be run during either buildtime or development time

	// If two images are byte-byte the same, then they are the same image
	// for performance and SEO purposes it is more optimal to treat them as one image.
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	const imageSpecificHash = hash(imageURL.toString(), require('node:crypto').createHash);

	if (isDevelopment) {
		const filepath = getImageFilepathMeta(imageFilename, imageSpecificHash, NEXTJS_FILEPATH_PREFIX)(imageInfo.width, imageInfo.type);
		const [_, errorImageAccess] = await safePromise(() => nodeFs.access(filepath));
		if (errorImageAccess !== null) {
			await nodeFs.writeFile(filepath, fetchedImage.imageBuffer);
		}

		const imageUrl = getImageUrlMeta(imageFilename, imageSpecificHash)(imageInfo.width, imageInfo.type);
		const returnValue = <img {...imageOptimizationAttributes} {...rawImageProps} src={imageUrl} alt={props.alt} />;
		devCache.set(devCacheKey, returnValue);
		return returnValue;
	}

	await nodeFs.mkdir(NEXTJS_FILEPATH_PREFIX, { recursive: true });

	const startTime = Date.now();
	const reportTime = () => {
		console.log(`Optimizing image took ${Math.round((Date.now() - startTime) / 1000)} seconds: ${imageFilename}`);
	};

	if (imageInfo.type === 'svg') {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo);
		await optimizeSvgAndWriteToDisk(svgEntry, imageBuffer, imageInfo);
		reportTime();
		return <img {...imageOptimizationAttributes} {...rawImageProps} src={svgEntry.src} alt={props.alt} />;
	}

	const pictureSources = getPictureSourcesNotSvg(false, imageFilename, imageSpecificHash, imageInfo, NEXTJS_FILEPATH_PREFIX, userSpecifiedWidth);
	await optimizeImageAndWriteToDisk(pictureSources, imageBuffer, imageInfo, height, userSpecifiedWidth);
	reportTime();

	const sources: JSX.Element[] = [];
	for (const source of pictureSources) {
		const sourceKey = `${imageSpecificHash}${source.type}`;

		if (userSpecifiedWidth) {
			sources.push(<source key={sourceKey} src={source.srcSetORsrc} type={source.type} />);
			continue;
		}

		sources.push(<source key={sourceKey} srcSet={source.srcSetORsrc} type={source.type} />);
	}

	return (
		<picture>
			{sources}
			<img {...imageOptimizationAttributes} {...rawImageProps} alt={props.alt} />
		</picture>
	);
}

interface FetchedImage {
	imageBuffer: Buffer;
	imageInfo: ImageInfo;
}

interface FetchRemoteImageCacheEntry {
	fetchedImage: FetchedImage;
	lastModified: string | null;
}

interface FetchRemoteImageMetadataCacheEntry {
	lastModified: FetchRemoteImageCacheEntry['lastModified'];
	imageInfo: FetchRemoteImageCacheEntry['fetchedImage']['imageInfo'];
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

	const p1 = cacheStorage.setItem<FetchRemoteImageMetadataCacheEntry>(metadataCacheKey, { lastModified: entry.lastModified, imageInfo: entry.fetchedImage.imageInfo });
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

async function fetchRemoteImageLastModified(imageURL: URL): Promise<string | null> {
	const [headImageResponse, headFetchError] = await safePromise(() => fetch(imageURL, { method: 'HEAD' }));
	if (headFetchError !== null) {
		return null;
	}

	if (!headImageResponse.ok || headImageResponse.status !== 200) {
		return null;
	}

	const lastModified = headImageResponse.headers.get('Last-Modified');
	return lastModified;
}

async function fetchRemoteImage(imageURL: URL, fetchRequestInit?: RequestInit): ErrorReturnPromise<FetchedImage> {
	console.log(`Fetching remote image ${imageURL}`);

	// const currentLastModified = await fetchRemoteImageLastModified(imageURL);
	const cacheKey = hash(imageURL.toString(), require('node:crypto').createHash);

	// During the build this cache would be used as a de-duplication mechanism.
	// If the same image would be requested in two routes.
	const cachedImage = await getFetchRemoteImageCache(cacheKey);
	if (cachedImage) {
		console.log(`Fetching remote image cache hit ${imageURL}`);
		// if (cachedImage.lastModified === currentLastModified || currentLastModified === null) {
		return [cachedImage.fetchedImage, null];
		// }

		// await setFetchRemoteImageCache(cacheKey, null);
	}

	// TODO: Move this calculation to cstd-ts
	const millisecond = 1;
	const second = millisecond * 1000;
	const minute = second * 60;
	const hour = minute * 60;
	const [imageResponse, fetchError] = await safePromise(() =>
		fetch(imageURL, {
			signal: AbortSignal.timeout(hour),
			dispatcher: new Agent({ connectTimeout: hour }),
			...fetchRequestInit,
		}),
	);
	if (fetchError !== null) {
		console.log(`FetchRemoteImage, fetch failed with error: ${fetchError}`);
		const error = new Error(`Error while fetching image ${imageURL} response was: ${imageResponse}\n\nThe error was ${fetchError}`, { cause: fetchError });
		return [null, error];
	}

	if (!imageResponse.ok || imageResponse.status !== 200) {
		return [null, new Error(`Unable to fetch image ${imageResponse.statusText}`)];
	}

	const lastModified = imageResponse.headers.get('Last-Modified');
	const [imageArrayBuffer, imageArrayBufferError] = await safePromise(() => imageResponse.arrayBuffer());
	if (imageArrayBufferError !== null) {
		return [null, imageArrayBufferError];
	}

	const imageBuffer = Buffer.from(imageArrayBuffer);
	const imageInfo = readImageInfoFromBuffer(imageBuffer);

	const fetchedImage: FetchedImage = {
		imageBuffer,
		imageInfo,
	};

	await setFetchRemoteImageCache(cacheKey, { fetchedImage, lastModified });
	return [fetchedImage, null];
}

const OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY = (x: string) => `OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY:${x}`;

async function optimizeSvgAndWriteToDisk(svgEntry: INTERNAL_SVGEntry, imageBuffer: Buffer, imageInfo: ImageInfo): Promise<void> {
	if (imageInfo.type !== 'svg') {
		throw new Error('This function optimizes only svg images');
	}

	const svgo: typeof SvgoType = requireWebpackExternalDependency__MakeWebpackNotBundleIt('svgo');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	const cacheKey = OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY(svgEntry.filepath);
	let optimizedSvg = await cacheStorage.getItem<string>(cacheKey);
	if (optimizedSvg === null) {
		optimizedSvg = optimizeSvg(imageBuffer.toString(), svgo);
		await cacheStorage.setItem(cacheKey, optimizedSvg);
	}

	await nodeFs.writeFile(svgEntry.filepath, optimizedSvg);
}

const OPTIMIZE_REMOTE_IMAGE_CACHE_KEY = (x: string) => `OPTIMIZE_REMOTE_IMAGE_CACHE_KEY:${x}`;

async function optimizeImageAndWriteToDisk(
	pictureSources: INTERNAL_PictureSource[],
	imageBuffer: Buffer,
	imageInfo: ImageInfo,
	inferredHeight: number,
	userSpecifiedWidth?: number,
): Promise<void> {
	const sharp: typeof SharpType = requireWebpackExternalDependency__MakeWebpackNotBundleIt('sharp');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	if (imageInfo.type === 'svg') {
		throw new Error('This function can NOT optimize svg');
	}

	const exportFunction = async (optimizedImageBuffer: Buffer, filepath: string, targetImageInfo?: ImageInfo) => {
		if (userSpecifiedWidth && targetImageInfo && targetImageInfo.height !== inferredHeight) {
			throw new Error(
				`THIS SHOULD NOT HAPPEN! The user specified the width of the image is ${userSpecifiedWidth} and the inferred hight is ${inferredHeight}. BUT sharp thinks that the correct height should be ${targetImageInfo.height}. If you see this error contact the owner of this code and provide them with this error message.`,
			);
		}

		await nodeFs.writeFile(filepath, optimizedImageBuffer);
	};

	const getCacheFunction = async (cacheKey: string): Promise<Buffer | null> => {
		const localCacheKey = OPTIMIZE_REMOTE_IMAGE_CACHE_KEY(cacheKey);
		return await cacheStorage.getItemRaw<Buffer>(localCacheKey);
	};

	const setCacheFunction = async (cacheKey: string, optimizedImageBuffer: Buffer): Promise<void> => {
		const localCacheKey = OPTIMIZE_REMOTE_IMAGE_CACHE_KEY(cacheKey);
		await cacheStorage.setItem(localCacheKey, optimizedImageBuffer);
	};

	await optimizePictureSources(imageBuffer, pictureSources, exportFunction, getCacheFunction, setCacheFunction, sharp);
}

// biome-ignore lint/style/useNamingConvention: This is a hacky function. It's name reflects that.
// biome-ignore lint/suspicious/noExplicitAny: This is the return value of the require function.
function requireWebpackExternalDependency__MakeWebpackNotBundleIt(id: string): any {
	// biome-ignore lint/style/useNamingConvention:
	// biome-ignore lint/security/noGlobalEval:
	const originalNodejsRequire__NotAffectedByWebpackBuild = eval('require') as typeof require;
	return originalNodejsRequire__NotAffectedByWebpackBuild(id);
}

function convertToValidFilename(x: string): string {
	return x.replaceAll(/[\/|\\:*?"<>]/g, ' ').replaceAll('\n', ' ');
}
