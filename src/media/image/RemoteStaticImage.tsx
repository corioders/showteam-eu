// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025
import 'server-only';

import type NodeCryptoType from 'node:crypto';
import type NodeFsType from 'node:fs/promises';
import type NodePathType from 'node:path';
import type SharpType from 'sharp';
import type SvgoType from 'svgo';
import type { Storage as UnstorageStorage } from 'unstorage';
import type UnstorageFsDriverType from 'unstorage/drivers/fs-lite';

import type { BinaryLike } from 'node:crypto';
import readImageInfoFromBuffer from 'buffer-image-size';
import { type ErrorReturnPromise, safePromise } from 'cstd-ts/error/index.js';
import cacheDriver from 'cstd-ts/storage/unstorage/cacheDriver.js';
import type { ImgHTMLAttributes, JSX } from 'react';
import { createStorage } from 'unstorage';
import lruCacheDriver from 'unstorage/drivers/lru-cache';
import { type FormatType, IMAGE_OPTIMIZATION_ATTRIBUTES, type ImageInfo } from './image';

const ASSUMED_NEXTJS_IMAGE_FOLDER = './.next/static/media';
const ASSUMED_NEXTJS_URL_PREFIX = '/_next/static/media';

const SIZES = [640, 750, 828, 1080, 1200, 1920, 2048];
const FORMATS: FormatType[] = ['avif', 'webp'];

// The cache should work regardless of the environment we are in:
// Dev-server: The cache is used while developing to prevent fetching the same images
// Pre-rendering: The cache is hit when we encounter the same image
// Production(edge / nodejs): While we cannot change the CND static assets
// we can fallback to responding with base64 encoded image. If we are on the node runtime the cache could provide some speedup.
interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: This is a theoretical readonly thing.
	__CSTD_NEXT_IMAGES_CACHE?: UnstorageStorage;

	// biome-ignore lint/style/useNamingConvention: Same as above
	__CSTD_NEXT_IMAGES_DEV_CACHE?: Map<string, JSX.Element>;
}

const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE === undefined) {
	if (process.env['NEXT_IS_EXPORT_WORKER'] === 'true' || process.env.NODE_ENV === 'development') {
		const fsDriver: typeof UnstorageFsDriverType = require('unstorage/drivers/fs-lite');
		ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE = createStorage({
			driver: cacheDriver({ driver: fsDriver({ base: 'node_modules/.cache/cstd-next-remote-image' }) }),
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

export interface RemoteImageProps extends ImgHTMLAttributes<HTMLImageElement> {
	src: string;
	alt: string;
	filename?: string;
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
// I mean, a fallback will trigger, but it will not serve the optimized image.
//
// TODO: BLUR IMAGE DATA
export async function RemoteStaticImage(props: RemoteImageProps) {
	const devCacheKey = hash(JSON.stringify(props));
	if (process.env.NODE_ENV === 'development') {
		const cacheEntry = devCache.get(devCacheKey);
		if (cacheEntry) {
			return cacheEntry;
		}
	}
	console.log('RemoteStaticImage');

	// Make sute that the src provided is a valid URL
	const imageURL = new URL(props.src);
	const imageFilename = props.filename ?? props.alt;

	const rawImageProps: Partial<RemoteImageProps> = { ...props };

	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.src;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.alt;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.filename;

	const [fetchedImage, fetchError] = await fetchRemoteImage(imageURL);
	if (fetchError !== null) {
		console.log(fetchError);
		throw fetchError;
	}

	const imageOptimizationAttributes = {
		...IMAGE_OPTIMIZATION_ATTRIBUTES,
		sizes: '100vw',
		width: fetchedImage.imageInfo.width,
		height: fetchedImage.imageInfo.height,
	};

	if (process.env.NODE_ENV === 'development') {
		const nodePath: typeof NodePathType = require('node:path');
		const nodeFs: typeof NodeFsType = require('node:fs/promises');

		const imageSpecificHash = hash(imageURL.toString());
		const fullFilename = `${imageFilename}.${imageSpecificHash}.${fetchedImage.imageInfo.type}`;
		const fileOutputPath = nodePath.join(ASSUMED_NEXTJS_IMAGE_FOLDER, fullFilename);
		const [_, errorImageAccess] = await safePromise(() => nodeFs.access(fileOutputPath));
		if (errorImageAccess !== null) {
			await nodeFs.writeFile(fileOutputPath, fetchedImage.imageBuffer);
		}

		const returnValue = <img {...imageOptimizationAttributes} {...rawImageProps} src={`${ASSUMED_NEXTJS_URL_PREFIX}/${fullFilename}`} alt={props.alt} />;
		devCache.set(devCacheKey, returnValue);
		return returnValue;
	}

	if (process.env['NEXT_IS_EXPORT_WORKER'] !== 'true') {
		// Warn the user that they really should not be doing this
		// We are not in the pre-rendering phase. We have been called from a NON static route.
		// They are expecting us to optimize and save images while we are on the edge. When the static assets have already been deployed to a CND.
		// This is not how it work baby.
		console.log('figure out some good warning');

		if (fetchedImage.imageInfo.type === 'svg') {
			// This is the correct MIME type for svg
			fetchedImage.imageInfo.type += '+xml';
		}

		const stringifiedBuffer = Buffer.from(fetchedImage.imageBuffer).toString('base64');
		const imageBase64 = `data:image/${fetchedImage.imageInfo.type};base64,${stringifiedBuffer}`;

		// Return the base64 version because we cannot add more images via fs.writeSync into the nextjs's static directory
		return <img {...imageOptimizationAttributes} {...rawImageProps} src={imageBase64} alt={props.alt} />;
	}

	// The build-only code
	const nodeFs: typeof NodeFsType = require('node:fs/promises');
	await nodeFs.mkdir(ASSUMED_NEXTJS_IMAGE_FOLDER, { recursive: true });

	// If two images are byte-byte the same, then they are the same image
	// for performance and SEO purposes it is more optimal to treat them as one image.
	const imageSpecificHash = hash(fetchedImage.imageBuffer);

	console.log(`Optimizing image at ${props.src}`);
	if (fetchedImage.imageInfo.type === 'svg') {
		const outputFilename = await optimizeRemoteSVGImageAndWriteToDisk(fetchedImage, imageFilename, imageSpecificHash);
		return <img {...imageOptimizationAttributes} {...rawImageProps} src={`${ASSUMED_NEXTJS_URL_PREFIX}/${outputFilename}`} alt={props.alt} />;
	}

	const optimizationInfosPerFormat = await optimizeRemoteImageAndWriteToDisk(fetchedImage, imageFilename, imageSpecificHash);

	const srcSetsInfo: { srcSet: string; format: FormatType }[] = [];
	for (const format of FORMATS) {
		const imageInfos = optimizationInfosPerFormat[format].sort((a, b) => a.width - b.width);
		let srcSet = '';
		for (const imageInfo of imageInfos) {
			srcSet += `${ASSUMED_NEXTJS_URL_PREFIX}/${imageInfo.outputFilename} ${imageInfo.width}w, `;
		}
		srcSet = srcSet.slice(0, srcSet.length - 2);
		srcSetsInfo.push({ srcSet, format });
	}

	const sources: JSX.Element[] = [];
	for (const srcSetInfo of srcSetsInfo) {
		const source = <source srcSet={srcSetInfo.srcSet} type={`image/${srcSetInfo.format}`} />;
		sources.push(source);
	}

	return (
		<picture>
			{sources}
			<img {...imageOptimizationAttributes} {...rawImageProps} srcSet={srcSetsInfo[0].srcSet} alt={props.alt} />
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

	if (entry === null) {
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
	if (metadata === null) {
		return null;
	}

	const buffer = await cacheStorage.getItemRaw(bufferCacheKey);
	if (buffer === null) {
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

async function fetchRemoteImage(imageURL: URL): ErrorReturnPromise<FetchedImage> {
	// const currentLastModified = await fetchRemoteImageLastModified(imageURL);
	const cacheKey = hash(imageURL.toString());

	// During the build this cache would be used as a de-duplication mechanism.
	// If the same image would be requested in two routes.
	const cachedImage = await getFetchRemoteImageCache(cacheKey);
	if (cachedImage !== null) {
		// if (cachedImage.lastModified === currentLastModified || currentLastModified === null) {
		return [cachedImage.fetchedImage, null];
		// }

		// await setFetchRemoteImageCache(cacheKey, null);
	}

	const nextjsFetch = fetch as unknown as { _nextOriginalFetch: typeof fetch };
	const originalFetchFunction = nextjsFetch._nextOriginalFetch;
	const [imageResponse, fetchError] = await safePromise(() => originalFetchFunction(imageURL));
	if (fetchError !== null) {
		const error = new Error(`Error while fetching image ${imageURL} got: ${imageResponse}`, { cause: fetchError });
		return [null, error];
	}

	if (!imageResponse.ok || imageResponse.status !== 200) {
		// TODO: Create a function in cstd-ts errors to auto-create this error
		return [null, new Error(`Unable to fetch image ${imageResponse.statusText}`)];
	}

	const lastModified = imageResponse.headers.get('Last-Modified');
	const [imageArrayBuffer, imageArrayBufferError] = await safePromise(() => imageResponse.arrayBuffer());
	if (imageArrayBufferError !== null) {
		return [null, imageArrayBufferError];
	}

	const imageBuffer = Buffer.from(imageArrayBuffer);
	const imageInfo = readImageInfoFromBuffer(imageBuffer) as ImageInfo;

	const fetchedImage: FetchedImage = {
		imageBuffer,
		imageInfo,
	};

	await setFetchRemoteImageCache(cacheKey, { fetchedImage, lastModified });
	return [fetchedImage, null];
}

const OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY = (x: string) => `OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY:${x}`;

async function optimizeRemoteSVGImageAndWriteToDisk(fetchedImage: FetchedImage, imageFilename: string, imageSpecificHash: string): Promise<string> {
	const { optimize: svgoOptimize }: typeof SvgoType = requireWebpackExternalDependency__MakeWebpackNotBundleIt('svgo');
	const nodePath: typeof NodePathType = require('node:path');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	if (fetchedImage.imageInfo.type !== 'svg') {
		throw new Error('This function optimizes only svg images');
	}

	const unsafeSvg = fetchedImage.imageBuffer.toString();
	const fullFilename = `${imageFilename}.${imageSpecificHash}.svg`;

	const cacheKey = OPTIMIZE_REMOTE_SVG_IMAGE_CACHE_KEY(fullFilename);
	let optimizedSvg = await cacheStorage.getItem<string>(cacheKey);
	if (optimizedSvg === null) {
		// TODO: Fix, escape svg
		const safeSvg = unsafeSvg;
		optimizedSvg = svgoOptimize(safeSvg, { multipass: true }).data;
		await cacheStorage.setItem(cacheKey, optimizedSvg);
	}

	const fileOutputPath = nodePath.join(ASSUMED_NEXTJS_IMAGE_FOLDER, fullFilename);
	await nodeFs.writeFile(fileOutputPath, optimizedSvg);

	return fullFilename;
}

interface OptimizationInfo {
	width: number;
	outputFilename: string;
}

const OPTIMIZE_REMOTE_IMAGE_CACHE_KEY = (x: string) => `OPTIMIZE_REMOTE_IMAGE_CACHE_KEY:${x}`;

async function optimizeRemoteImageAndWriteToDisk(
	fetchedImage: FetchedImage,
	imageFilename: string,
	imageSpecificHash: string,
): Promise<Record<string, OptimizationInfo[]>> {
	const sharp: typeof SharpType = requireWebpackExternalDependency__MakeWebpackNotBundleIt('sharp');
	const nodePath: typeof NodePathType = require('node:path');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	if (fetchedImage.imageInfo.type === 'svg') {
		throw new Error('This function can NOT optimize svg');
	}

	let imageOptimization = sharp(fetchedImage.imageBuffer, { animated: true, sequentialRead: true });

	// By default sharp strips all of the image metadata that includes the correct rotation.
	// To preserve the correct rotation *actually* rotate the image.
	imageOptimization = imageOptimization.rotate();

	const optimizationInfosPerFormat: Record<string, OptimizationInfo[]> = {};
	for (const format of FORMATS) {
		optimizationInfosPerFormat[format] = [];
	}

	const optimizationPromises: Promise<void>[] = [];
	const sizesWithMaxWidth = [...SIZES, fetchedImage.imageInfo.width];
	for (const targetWidth of sizesWithMaxWidth) {
		// Prevent upscaling images
		if (targetWidth > fetchedImage.imageInfo.width) {
			continue;
		}

		const imageOptimizationWidth = imageOptimization.clone().resize({ width: targetWidth });
		for (const targetFormat of FORMATS) {
			const promise = (async () => {
				const imageOptimizationWidthFormat = imageOptimizationWidth.clone();

				const fullFilename = `${imageFilename}.${imageSpecificHash}.${targetWidth}.${targetFormat}`;
				optimizationInfosPerFormat[targetFormat].push({ width: targetWidth, outputFilename: fullFilename });

				const cacheKey = OPTIMIZE_REMOTE_IMAGE_CACHE_KEY(fullFilename);
				let imageBuffer = await cacheStorage.getItemRaw<Buffer>(cacheKey);
				if (imageBuffer === null) {
					// We can get away with caching at this level , because sharp runs the optimization pipeline only at the end.
					imageBuffer = await imageOptimizationWidthFormat.toBuffer();
					await cacheStorage.setItemRaw(cacheKey, imageBuffer);
				}

				const fileOutputPath = nodePath.join(ASSUMED_NEXTJS_IMAGE_FOLDER, fullFilename);
				await nodeFs.writeFile(fileOutputPath, imageBuffer);
			})();

			optimizationPromises.push(promise);
		}
	}

	await Promise.all(optimizationPromises);
	return optimizationInfosPerFormat;
}

function hash(data: BinaryLike): string {
	const nodeCrypto: typeof NodeCryptoType = require('node:crypto');
	return nodeCrypto.createHash('shake256', { outputLength: 32 }).update(data).digest('hex');
}

// biome-ignore lint/style/useNamingConvention: This is a hacky function. It's name reflects that.
// biome-ignore lint/suspicious/noExplicitAny: This is the return value of the require function.
function requireWebpackExternalDependency__MakeWebpackNotBundleIt(id: string): any {
	// biome-ignore lint/style/useNamingConvention:
	// biome-ignore lint/security/noGlobalEval:
	const originalNodejsRequire__NotAffectedByWebpackBuild = eval('require') as typeof require;
	return originalNodejsRequire__NotAffectedByWebpackBuild(id);
}
