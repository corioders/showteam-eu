// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025
import 'server-only';

import type NodeCryptoType from 'node:crypto';
import type NodeFsType from 'node:fs/promises';
import type NodePathType from 'node:path';
import type KeyvFileType from 'keyv-file';
import type SharpType from 'sharp';
import type SvgoType from 'svgo';

import readImageInfoFromBuffer from 'buffer-image-size';
import { Keyv } from 'cacheable';
import { type ErrorReturnPromise, safePromise } from 'cstd-ts/error/index.js';
import type { ImgHTMLAttributes, JSX } from 'react';
import { type FormatType, IMAGE_OPTIMIZATION_ATTRIBUTES, type ImageInfo } from './image';

const ASSUMED_NEXTJS_IMAGE_FOLDER = './.next/static/media';
const ASSUMED_NEXTJS_URL_PREFIX = '/_next/static/media';

const SIZES = [640, 750, 828, 1080, 1200, 1920, 2048];
const FORMATS: FormatType[] = ['avif', 'webp'];

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
	// Make sute that the src provided is a valid URL
	const imageURL = new URL(props.src);
	const imageURLString = imageURL.toString();

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

	if (process.env['NEXT_IS_EXPORT_WORKER'] !== 'true') {
		if (process.env.NODE_ENV !== 'development') {
			// Warn the user that they really should not be doing this
			// We are not in the pre-rendering phase. We have been called from a NON static route.
			// They are expecting us to optimize and save images while we are on the edge. When the static assets have already been deployed to a CND.
			// This is not how it work baby.
		}

		if (fetchedImage.imageInfo.type === 'svg') {
			// This is the correct MIME type for svg
			fetchedImage.imageInfo.type += '+xml';
		}

		// Return the base64 version because we cannot add more images via fs.writeSync into the nextjs's static directory
		const stringifiedBuffer = Buffer.from(fetchedImage.imageBuffer).toString('base64');
		const imageBase64 = `data:image/${fetchedImage.imageInfo.type};base64,${stringifiedBuffer}`;
		return <img {...imageOptimizationAttributes} {...rawImageProps} src={imageBase64} alt={props.alt} />;
	}

	const nodeCrypto: typeof NodeCryptoType = require('node:crypto');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');
	await nodeFs.mkdir(ASSUMED_NEXTJS_IMAGE_FOLDER, { recursive: true });

	const imageSpecificHash = nodeCrypto.createHash('shake256', { outputLength: 4 }).update(imageURLString).digest('hex');

	console.log(`Optimizing image at ${props.src}`);
	const imageFilename = props.filename ?? props.alt;
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

// The cache should work regardless of the environment we are in:
// Dev-server: The cache is used while developing to prevent fetching the same images
// Pre-rendering: The cache is hit when we encounter the same image
// Production(edge / nodejs): While we cannot change the CND static assets
// we can fallback to responding with base64 encoded image. If we are on the node runtime the cache could provide some speedup.
interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: This is a theoretical readonly thing.
	__CSTD_NEXT_IMAGES_CACHE?: Keyv;
}

const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE === undefined) {
	let store = undefined;
	if (process.env['NEXT_IS_EXPORT_WORKER'] === 'true' || process.env.NODE_ENV === 'development') {
		const KeyvFile: typeof KeyvFileType = require('keyv-file').default;
		store = new KeyvFile({
			filename: 'node_modules/.cache/cstd-next-remote-image.json',
		});
	}

	ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE = new Keyv({ store });
}

const cache = ourGlobalThis.__CSTD_NEXT_IMAGES_CACHE;

interface FetchedImage {
	imageBuffer: Buffer;
	imageInfo: ImageInfo;
}

interface FetchRemoteImageCacheEntry {
	fetchedImage: FetchedImage;
	lastModified: string | null;
}

async function fetchRemoteImage(imageURL: URL): ErrorReturnPromise<FetchedImage> {
	const cacheKey = `fetchRemoteImage:${imageURL.toString()}`;

	const currentLastModified = await fetchRemoteImageLastModified(imageURL);

	// During the build this cache would be used as a de-duplication mechanism.
	// If the same image would be requested in two routes.
	const cachedImage = await cache.get<FetchRemoteImageCacheEntry>(cacheKey);
	if (cachedImage !== undefined) {
		if (cachedImage.lastModified === currentLastModified || currentLastModified === null) {
			return [cachedImage.fetchedImage, null];
		}

		cache.delete(cacheKey);
	}

	const nextjsFetch = fetch as unknown as { _nextOriginalFetch: typeof fetch };
	const originalFetchFunction = nextjsFetch._nextOriginalFetch;
	// console.log(globalThis._nextOriginalFetch)
	// console.log(originalFetchFunction.toString())
	// console.log(originalFetchFunction)
	const [imageResponse, fetchError] = await safePromise(() => originalFetchFunction(imageURL));
	console.log(`fetched image ${imageURL}`);
	if (fetchError !== null) {
		const error = new Error(`Error while fetching image ${imageURL} got: ${imageResponse}`, { cause: fetchError });
		console.log(error);
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

	await cache.set<FetchRemoteImageCacheEntry>(cacheKey, { fetchedImage, lastModified });
	return [fetchedImage, null];
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

interface OptimizationSvgInfoCacheEntry {
	optimizedSvg: string;
}

async function optimizeRemoteSVGImageAndWriteToDisk(fetchedImage: FetchedImage, imageFilename: string, imageSpecificHash: string): Promise<string> {
	const nodejsRequireFunctionSimilarToWebpackExternalDependency = eval('require') as Function;

	const { optimize: svgoOptimize }: typeof SvgoType = nodejsRequireFunctionSimilarToWebpackExternalDependency('svgo');

	const nodePath: typeof NodePathType = require('node:path');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	if (fetchedImage.imageInfo.type !== 'svg') {
		throw new Error('This function optimizes only svg images');
	}

	const unsafeSvg = fetchedImage.imageBuffer.toString();

	const fullFilename = `${imageFilename}.${imageSpecificHash}.svg`;
	const cacheKey = `optimizeRemoteSVGImageAndWriteToDisk:${fullFilename}`;

	let optimizedSvg = undefined;
	const cacheEntry = await cache.get<OptimizationSvgInfoCacheEntry>(cacheKey);
	if (cacheEntry !== undefined) {
		optimizedSvg = cacheEntry.optimizedSvg;
	} else {
		// TODO: Fix
		const safeSvg = unsafeSvg;
		optimizedSvg = svgoOptimize(safeSvg, { multipass: true }).data;
		await cache.set<OptimizationSvgInfoCacheEntry>(cacheKey, { optimizedSvg });
	}

	const fileOutputPath = nodePath.join(ASSUMED_NEXTJS_IMAGE_FOLDER, fullFilename);
	await nodeFs.writeFile(fileOutputPath, optimizedSvg);

	return fullFilename;
}

interface OptimizationInfo {
	width: number;
	outputFilename: string;
}

interface OptimizationInfoCacheEntry {
	optimizedImageBuffer: Buffer;
}

async function optimizeRemoteImageAndWriteToDisk(
	fetchedImage: FetchedImage,
	imageFilename: string,
	imageSpecificHash: string,
): Promise<Record<string, OptimizationInfo[]>> {
	const nodejsRequireFunctionSimilarToWebpackExternalDependency = eval('require') as Function;
	const sharp: typeof SharpType = nodejsRequireFunctionSimilarToWebpackExternalDependency('sharp');
	const nodePath: typeof NodePathType = require('node:path');
	const nodeFs: typeof NodeFsType = require('node:fs/promises');

	if (fetchedImage.imageInfo.type === 'svg') {
		throw new Error('This function cannot optimize svg');
	}

	const sizesWithMaxWidth = [...SIZES, fetchedImage.imageInfo.width];

	let imageOptimization = sharp(fetchedImage.imageBuffer, { animated: true, sequentialRead: true });

	// By default sharp strips all of the image metadata that includes the correct rotation.
	// To preserve the correct rotation *actually* rotate the image.
	imageOptimization = imageOptimization.rotate();

	const optimizationInfosPerFormat: Record<string, OptimizationInfo[]> = {};
	for (const format of FORMATS) {
		optimizationInfosPerFormat[format] = [];
	}

	const optimizationPromises: Promise<void>[] = [];

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

				const cacheKey = `optimizeRemoteImageAndWriteToDisk:${fullFilename}`;
				const cacheEntry = await cache.get<OptimizationInfoCacheEntry>(cacheKey);

				let imageBuffer = undefined;
				if (cacheEntry !== undefined) {
					imageBuffer = cacheEntry.optimizedImageBuffer;
				} else {
					// We can get away with this level of cache, because sharp runs the optimization pipeline only at the end.
					imageBuffer = await imageOptimizationWidthFormat.toBuffer();
					await cache.set<OptimizationInfoCacheEntry>(cacheKey, { optimizedImageBuffer: imageBuffer });
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
