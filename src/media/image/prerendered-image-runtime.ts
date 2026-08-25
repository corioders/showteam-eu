// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

/** biome-ignore-all lint/style/noCommonJs: Sharp and SVGO must stay build-time dependencies. */

import { createHash } from "node:crypto";
import type NodeFsType from "node:fs/promises";
import path from "node:path";

import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";
import cacheDriver from "cstd-ts/storage/unstorage/cache-driver.js";
import { StatusCodes } from "http-status-codes";
import pLimit from "p-limit";
import { use } from "react";
import type SharpType from "sharp";
import type * as SvgoType from "svgo";
import { Agent, fetch, Headers, type RequestInit, type Response } from "undici";
import { createStorage, type Storage as UnstorageStorage } from "unstorage";
import type UnstorageFsDriverType from "unstorage/drivers/fs-lite";
import lruCacheDriver from "unstorage/drivers/lru-cache";

import { hash, type ImageInfo, optimizeImageBufferInternal, readImageInfoFromBuffer, shouldOptimizeImages } from "./internal.js";
import type { OptimizedImageDescriptor } from "./optimized-image.jsx";
import { getDevelopmentPrerenderedImage } from "./prerendered-image-development.js";
import { getPrerenderedImageMode, getPrerenderedImageRequestKey, type PrerenderedImageRequest } from "./prerendered-image-request.js";
import { PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY, type PrerenderedImageResource } from "./prerendered-image-resource.js";
import { getPrerenderedImageFilename, LOCAL_STATIC_IMAGE_PROTOCOL } from "./prerendered-image-source.js";

const FETCH_CONCURRENCY_LIMIT = 3;
const FETCH_RETRY = 3;
const IMAGE_ASSET_OUTPUT_DIRECTORY = "./public/_cstd/image/asset";
const IMAGE_ASSET_URL_PREFIX = "/_cstd/image/asset";
const LOCAL_STATIC_IMAGE_SOURCE_DIRECTORY = ".next/cache/corioders/cstd-next-local-static-image/source";
const CONTENT_HASH_REGEX = /^[\da-f]{64}$/;

export interface PrerenderedImageServerRequest extends PrerenderedImageRequest {
	fetchRequestInit?: RequestInit;
}

interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: We are setting global state.
	__CSTD_NEXT_PRERENDERED_IMAGE_CACHE?: UnstorageStorage;
}

const ourGlobalThis = globalThis as OurGlobalThis;
if (ourGlobalThis.__CSTD_NEXT_PRERENDERED_IMAGE_CACHE === undefined) {
	const fsDriver: typeof UnstorageFsDriverType = require("unstorage/drivers/fs-lite");
	const HALF_GIGABYTE_IN_BYTES = 536_870_912;
	ourGlobalThis.__CSTD_NEXT_PRERENDERED_IMAGE_CACHE = createStorage({
		driver: cacheDriver({
			cacheDriver: lruCacheDriver({ maxSize: HALF_GIGABYTE_IN_BYTES }),
			driver: fsDriver({ base: ".next/cache/corioders/cstd-next-prerendered-image" }),
		}),
	});
}

const cacheStorage = ourGlobalThis.__CSTD_NEXT_PRERENDERED_IMAGE_CACHE;
const prerenderedImagePromises = new Map<string, Promise<PrerenderedImageResource>>();

export function loadPrerenderedImage(request: PrerenderedImageServerRequest): Promise<OptimizedImageDescriptor> {
	return loadPrerenderedImageResource(request).then((resource) => resource.image);
}

/** Suspends only the server prerender while fetch/Sharp/filesystem work completes. */
export function usePrerenderedImageResource(request: PrerenderedImageServerRequest): PrerenderedImageResource {
	return use(loadPrerenderedImageResource(request));
}

export function loadPrerenderedImageResource(request: PrerenderedImageServerRequest): Promise<PrerenderedImageResource> {
	assertPrerenderedImageGenerationAllowed();
	const key = getPrerenderedImageRequestKey(request);
	const existingPromise = prerenderedImagePromises.get(key);
	if (existingPromise) {
		return existingPromise;
	}

	const developmentResource = request.fetchRequestInit === undefined ? getDevelopmentPrerenderedImage(request, key) : null;
	const imagePromise = developmentResource === null ? generatePrerenderedImageResource(request, key) : Promise.resolve(developmentResource);
	prerenderedImagePromises.set(key, imagePromise);
	return imagePromise;
}

async function generatePrerenderedImageResource(request: PrerenderedImageServerRequest, key: string): Promise<PrerenderedImageResource> {
	const image = await generatePrerenderedImage(request);
	const nodeFs: typeof NodeFsType = require("node:fs/promises");
	await nodeFs.mkdir(PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY, { recursive: true });
	await nodeFs.writeFile(path.join(PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY, `${key}.json`), JSON.stringify(image));
	return { image, markerKey: key };
}

export function assertPrerenderedImageGenerationAllowed(): void {
	if (process.env["NEXT_IS_EXPORT_WORKER"] !== "true" && process.env.NODE_ENV !== "development") {
		// biome-ignore lint/plugin/no-throw: Runtime image generation would mutate deployment assets, so this invalid execution mode must abort the render.
		throw new Error("StaticImage can only generate images during next dev or Next static prerendering.");
	}
}

async function generatePrerenderedImage(request: PrerenderedImageServerRequest): Promise<OptimizedImageDescriptor> {
	const isDevelopmentMode = process.env.NODE_ENV === "development" || !shouldOptimizeImages();
	const imageMode = getPrerenderedImageMode();
	const imageOutputDirectory = path.join(IMAGE_ASSET_OUTPUT_DIRECTORY, imageMode);
	const imageURLPrefix = `${IMAGE_ASSET_URL_PREFIX}/${imageMode}`;
	const [filename, filenameError] = getPrerenderedImageFilename(request.src);
	if (filenameError !== null) {
		// biome-ignore lint/plugin/no-throw: Image generation is a React prerender boundary and cannot continue without a valid source filename.
		throw filenameError;
	}
	const imageURL = new URL(request.src);
	const imageFilename = convertToValidFilename(filename);

	const [loadedImage, sourceError] = await readImageSource(imageURL, request.fetchRequestInit);
	if (sourceError !== null) {
		// biome-ignore lint/plugin/no-throw: Static prerendering cannot produce a descriptor without the source bytes.
		throw new Error(`Unable to load image source ${imageURL}`, { cause: sourceError });
	}

	const nodeFs: typeof NodeFsType = require("node:fs/promises");
	await nodeFs.mkdir(imageOutputDirectory, { recursive: true });
	const exportFile = async (data: Buffer, filepath: string) => {
		const [_, statsError] = await safePromise(() => nodeFs.stat(filepath));
		if (statsError === null) {
			return;
		}
		await nodeFs.writeFile(filepath, data);
	};
	const getCache = (cacheKey: string) => cacheStorage.getItemRaw<Buffer>(`OPTIMIZE_PRERENDERED_IMAGE_CACHE_KEY:${cacheKey}`);
	const setCache = (cacheKey: string, data: Buffer) => cacheStorage.setItemRaw(`OPTIMIZE_PRERENDERED_IMAGE_CACHE_KEY:${cacheKey}`, data);
	const sharp: typeof SharpType = requireBuildDependency("sharp");
	const svgo: typeof SvgoType = requireBuildDependency("svgo");
	const [optimizedImage, optimizationError] = await optimizeImageBufferInternal({
		baseFilePath: imageOutputDirectory,
		baseURL: imageURLPrefix,
		createHash,
		exportFile,
		filename: imageFilename,
		getCache,
		imageBuffer: loadedImage.imageBuffer,
		isDevelopmentMode,
		setCache,
		sharp,
		sizes: request.sizes,
		svgo,
	});
	if (optimizationError !== null) {
		// biome-ignore lint/plugin/no-throw: React must reject this prerender because no valid image descriptor was produced.
		throw optimizationError;
	}

	return optimizedImage;
}

interface LoadedImage {
	imageBuffer: Buffer;
	imageInfo: ImageInfo;
}

interface FetchRemoteImageCacheEntry {
	etag: string | null;
	loadedImage: LoadedImage;
	lastModified: string | null;
}

interface FetchRemoteImageMetadataCacheEntry {
	etag?: FetchRemoteImageCacheEntry["etag"];
	lastModified: FetchRemoteImageCacheEntry["lastModified"];
	imageInfo: FetchRemoteImageCacheEntry["loadedImage"]["imageInfo"];
}

const FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY = (key: string) => `FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY:${key}`;
const FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY = (key: string) => `FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY:${key}`;

async function setFetchRemoteImageCache(cacheKey: string, entry: FetchRemoteImageCacheEntry): Promise<void> {
	const metadataCacheKey = FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY(cacheKey);
	const bufferCacheKey = FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY(cacheKey);
	await Promise.all([
		cacheStorage.setItem<FetchRemoteImageMetadataCacheEntry>(metadataCacheKey, {
			etag: entry.etag,
			imageInfo: entry.loadedImage.imageInfo,
			lastModified: entry.lastModified,
		}),
		cacheStorage.setItemRaw(bufferCacheKey, entry.loadedImage.imageBuffer),
	]);
}

async function getFetchRemoteImageCache(cacheKey: string): Promise<FetchRemoteImageCacheEntry | null> {
	const metadata = await cacheStorage.getItem<FetchRemoteImageMetadataCacheEntry>(FETCH_REMOTE_IMAGE_METADATA_CACHE_KEY(cacheKey));
	if (!metadata) {
		return null;
	}

	const imageBuffer = await cacheStorage.getItemRaw(FETCH_REMOTE_IMAGE_BUFFER_CACHE_KEY(cacheKey));
	if (!imageBuffer) {
		return null;
	}

	return {
		etag: metadata.etag ?? null,
		loadedImage: { imageBuffer, imageInfo: metadata.imageInfo },
		lastModified: metadata.lastModified,
	};
}

async function readImageSource(imageURL: URL, fetchRequestInit?: RequestInit): ErrorReturnPromise<LoadedImage> {
	const sharp: typeof SharpType = requireBuildDependency("sharp");
	if (imageURL.protocol === LOCAL_STATIC_IMAGE_PROTOCOL) {
		return readLocalStaticImage(imageURL, sharp);
	}

	const imageURLForLogging = isDataURI(imageURL.toString()) ? "<DATA URI>" : imageURL.toString();
	const cacheKey = hash(imageURL.toString(), createHash);
	const cachedImage = await getFetchRemoteImageCache(cacheKey);
	const revalidationRequestInit = withRemoteImageRevalidationHeaders(fetchRequestInit, cachedImage);
	const [imageResponse, fetchError] = await fetchWithRetry(imageURL, revalidationRequestInit);
	if (fetchError !== null) {
		return [null, new Error(`Error while fetching image ${imageURLForLogging}`, { cause: fetchError })];
	}

	if (imageResponse.status === StatusCodes.NOT_MODIFIED) {
		if (cachedImage === null) {
			return [null, new Error(`Remote image returned 304 without a cached body: ${imageURLForLogging}`)];
		}

		await setFetchRemoteImageCache(cacheKey, {
			etag: imageResponse.headers.get("ETag") ?? cachedImage.etag,
			loadedImage: cachedImage.loadedImage,
			lastModified: imageResponse.headers.get("Last-Modified") ?? cachedImage.lastModified,
		});
		console.log(`Remote image unchanged ${imageURLForLogging}`);
		return [cachedImage.loadedImage, null];
	}

	if (!imageResponse.ok || imageResponse.status !== StatusCodes.OK) {
		return [null, new Error(`Unable to fetch image ${imageResponse.status} ${imageResponse.statusText}`)];
	}

	console.log(`Fetched remote image ${imageURLForLogging}`);
	const [imageArrayBuffer, imageArrayBufferError] = await safePromise(() => imageResponse.arrayBuffer());
	if (imageArrayBufferError !== null) {
		return [null, imageArrayBufferError];
	}

	const imageBuffer = Buffer.from(imageArrayBuffer);
	const [imageInfo, imageInfoError] = await readImageInfoFromBuffer(imageBuffer, sharp);
	if (imageInfoError !== null) {
		return [null, imageInfoError];
	}

	const loadedImage = { imageBuffer, imageInfo };
	await setFetchRemoteImageCache(cacheKey, {
		etag: imageResponse.headers.get("ETag"),
		loadedImage,
		lastModified: imageResponse.headers.get("Last-Modified"),
	});
	return [loadedImage, null];
}

function withRemoteImageRevalidationHeaders(fetchRequestInit: RequestInit | undefined, cachedImage: FetchRemoteImageCacheEntry | null): RequestInit | undefined {
	if (cachedImage === null) {
		return fetchRequestInit;
	}

	const headers = new Headers(fetchRequestInit?.headers);
	if (cachedImage.etag !== null && !headers.has("If-None-Match")) {
		headers.set("If-None-Match", cachedImage.etag);
	}
	if (cachedImage.lastModified !== null && !headers.has("If-Modified-Since")) {
		headers.set("If-Modified-Since", cachedImage.lastModified);
	}

	return { ...fetchRequestInit, headers };
}

async function readLocalStaticImage(imageURL: URL, sharp: typeof SharpType): ErrorReturnPromise<LoadedImage> {
	const contentHash = imageURL.hostname;
	if (!CONTENT_HASH_REGEX.test(contentHash)) {
		return [null, new Error(`Invalid local static image content hash: ${contentHash}`)];
	}

	const nodeFs: typeof NodeFsType = require("node:fs/promises");
	const sourceFilepath = path.join(process.cwd(), LOCAL_STATIC_IMAGE_SOURCE_DIRECTORY, contentHash);
	const [imageBuffer, readError] = await safePromise(() => nodeFs.readFile(sourceFilepath));
	if (readError !== null) {
		return [null, new Error(`Unable to read local static image source: ${sourceFilepath}`, { cause: readError })];
	}

	const [imageInfo, imageInfoError] = await readImageInfoFromBuffer(imageBuffer, sharp);
	if (imageInfoError !== null) {
		return [null, imageInfoError];
	}

	return [{ imageBuffer, imageInfo }, null];
}

function requireBuildDependency(id: string): any {
	// biome-ignore lint/security/noGlobalEval: Keep native build dependencies out of the Cloudflare runtime bundle.
	const buildRequire = eval("require") as typeof require;
	return buildRequire(id);
}

function convertToValidFilename(filename: string): string {
	return filename.replaceAll(/[/|\\:*?"<>]/g, " ").replaceAll("\n", " ");
}

function isDataURI(uri: string): boolean {
	return uri.startsWith("data:");
}

const fetchConcurrencyLimit = pLimit(FETCH_CONCURRENCY_LIMIT);

async function fetchWithRetry(imageURL: URL, fetchRequestInit?: RequestInit): ErrorReturnPromise<Response> {
	for (let fetchTry = 1; fetchTry <= FETCH_RETRY; fetchTry += 1) {
		const hour = 60 * 60 * 1000;
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
		if (fetchTry === FETCH_RETRY) {
			return [null, fetchError];
		}
	}

	return [null, new Error("Remote image retry loop ended unexpectedly.")];
}
