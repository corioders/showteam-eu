// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import svgo from 'svgo';
import { createStorage } from 'unstorage';
import type { LoaderDefinitionFunction } from 'webpack';
import {
	type ImageSize,
	type PictureSource,
	type UserSpecified,
	getPictureSourcesNotSvg,
	getSvgEntry,
	hash,
	inferImageSize,
	optimizePictureSources,
	optimizeSvg,
	readImageInfoFromBuffer,
	shouldOptimizeImages,
	validateUserSpecified,
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

	// Either o or/and s are present OR g is present. Never both

	// siZes of the image. When the user specifies width or height in the loader query, then the corresponding WIDTH is put into this z
	z?: string;

	// Optimized sources of the image.
	s?: INTERNAL_LowOverheadPictureSource[];

	// src of the svG image
	g?: string;
}

// biome-ignore lint/style/useNamingConvention: We want to emphasize this is an internal interface
interface INTERNAL_LowOverheadPictureSource {
	// The srcSet of the image.
	s: string;

	// The fallback sRc of the image
	r: string;

	// Type of the picture source.
	t: PictureSource['type'];
}
import fsDriver from 'unstorage/drivers/fs-lite';

const cache = createStorage({ driver: fsDriver({ base: '.next/cache/cstd-next-local-static-image' }) });
interface Options {
	isDev: boolean;
	isServer: boolean;
	isEdgeServer: boolean;
}

const RESOURCE_QUERY_WIDTH_REGEX = /\?w=(?<width>\d+)\.scaled/;
const RESOURCE_QUERY_HEIGHT_REGEX = /\?h=(?<height>\d+)\.scaled/;

const RESOURCE_QUERY_WIDTH_ARRAY_REGEX = /\?w=(?<width>\[[\d+|,| ]*\])\.scaled/;
const RESOURCE_QUERY_HEIGHT_ARRAY_REGEX = /\?h=(?<height>\[[\d+|,| ]*\])\.scaled/;

const NEXTJS_CLIENT_BUILD_FILEPATH_PREFIX = 'static/media';
const NEXTJS_SERVER_BUILD_FILEPATH_PREFIX = '../../static/media';
const NEXTJS_SERVER_DEV_FILEPATH_PREFIX = '../static/media';

// TODO: BLUUUR
//
// TODO: If the resourceQuery issue will not be resolved
// move all of the optim to be done during the server-phase.
// Having a split mind is not a good thing.
const localStaticImageLoader: LoaderDefinitionFunction = async function localStaticImageLoader(this, contentNotRawType) {
	this.cacheable(true);

	const imageBuffer = contentNotRawType as unknown as Buffer;
	const options = this.getOptions() as Options;
	const isDevelopmentMode = options.isDev || !shouldOptimizeImages();

	let userSpecified: undefined | UserSpecified = undefined;
	if (this.resourceQuery) {
		const widthSpecified = this.resourceQuery.match(RESOURCE_QUERY_WIDTH_REGEX)?.groups?.width;
		const heightSpecified = this.resourceQuery.match(RESOURCE_QUERY_HEIGHT_REGEX)?.groups?.height;

		const widthArraySpecified = this.resourceQuery.match(RESOURCE_QUERY_WIDTH_ARRAY_REGEX)?.groups?.width;
		const heightArraySpecified = this.resourceQuery.match(RESOURCE_QUERY_HEIGHT_ARRAY_REGEX)?.groups?.height;

		if (widthSpecified || heightSpecified) {
			userSpecified = {
				width: widthSpecified ? Number(widthSpecified) : undefined,
				height: heightSpecified ? Number(heightSpecified) : undefined,
			};
		}

		if (widthArraySpecified || heightArraySpecified) {
			userSpecified = {
				width: widthArraySpecified ? JSON.parse(widthArraySpecified) : undefined,
				height: heightArraySpecified ? JSON.parse(heightArraySpecified) : undefined,
			};
		}

		if (userSpecified) {
			validateUserSpecified(userSpecified);
		} else {
			throw new Error(`Cannot parse resourceQuery: ${this.resourceQuery}`);
		}
	}

	// ==================================================
	// ==================================================

	// Hear me out. For some reason nextjs does not run this loader
	// during client side compilation when the resourceQuery is provided.
	// That's all I know.
	//
	// https://discord.com/channels/752553802359505017/1352705911210377257/1352705911210377257
	// https://github.com/vercel/next.js/issues/77413
	//
	let shouldSkipEmittingTheFile = false;
	if (options.isServer && !userSpecified) {
		shouldSkipEmittingTheFile = true;
	}

	// Okay, this is even funnier. When the image with a resourceQuery is used on
	// a 'use client' route, then it is webpack loaded by both the server-phase and the client-phase.
	// For now let's say we stick to the server-phase so we skip the optim while we're on the client.
	if (!options.isServer && userSpecified) {
		shouldSkipEmittingTheFile = true;
	}

	if (options.isEdgeServer) {
		shouldSkipEmittingTheFile = true;
	}

	let pathPrefix = NEXTJS_CLIENT_BUILD_FILEPATH_PREFIX;
	if (options.isServer && !shouldSkipEmittingTheFile) {
		pathPrefix = NEXTJS_SERVER_BUILD_FILEPATH_PREFIX;
	}
	if (options.isServer && !shouldSkipEmittingTheFile && options.isDev) {
		pathPrefix = NEXTJS_SERVER_DEV_FILEPATH_PREFIX;
	}

	// ==================================================
	// ==================================================

	const imageSpecificHash = hash(imageBuffer, createHash);
	const imageFilename = path.basename(this.resourcePath);
	const imageInfo = readImageInfoFromBuffer(imageBuffer);

	// So the conditions go like follows:
	// IF the user did not specify anything we just set the original size
	// IF the user specified only one width OR one height, we infer the other size and set that as width and height of the image & we set the sizes to the inferred width
	// IF the user specified width array OR height array then we set the original size
	let imageSizeForTheImgElement: ImageSize = imageInfo;
	let sizes: string | undefined = undefined;
	if (userSpecified && !Array.isArray(userSpecified.width) && !Array.isArray(userSpecified.height)) {
		imageSizeForTheImgElement = inferImageSize(imageInfo, userSpecified.width, userSpecified.height);
		sizes = `${imageSizeForTheImgElement.width}px`;
	}

	if (imageInfo.type === 'svg') {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo, pathPrefix);
		const importReturn: INTERNAL_LocalStaticImageImport = {
			contentHash: imageSpecificHash,
			filename: imageFilename,

			w: imageSizeForTheImgElement.width,
			h: imageSizeForTheImgElement.height,
			g: svgEntry.src,
		};
		const importReturnString = `export default ${JSON.stringify(importReturn)}`;

		// We are optimizing images only while building client.
		if (shouldSkipEmittingTheFile) {
			return importReturnString;
		}

		// Skip optimization in development mode
		if (isDevelopmentMode) {
			this.emitFile(svgEntry.filepath, imageBuffer);
			return importReturnString;
		}

		const optimizedSvg = optimizeSvg(imageBuffer.toString(), svgo);
		this.emitFile(svgEntry.filepath, optimizedSvg);

		return importReturnString;
	}

	const pictureSources = getPictureSourcesNotSvg(isDevelopmentMode, imageFilename, imageSpecificHash, imageInfo, pathPrefix, userSpecified);
	const loPictureSources: INTERNAL_LowOverheadPictureSource[] = pictureSources.map((ps) => ({ s: ps.srcSet, r: ps.fallbackSrc, t: ps.type }));

	const importReturn: INTERNAL_LocalStaticImageImport = {
		contentHash: imageSpecificHash,
		filename: imageFilename,

		w: imageSizeForTheImgElement.width,
		h: imageSizeForTheImgElement.height,
		s: loPictureSources,
		z: sizes,
	};
	const importReturnString = `export default ${JSON.stringify(importReturn)}`;

	// We are optimizing images only while building client.
	if (shouldSkipEmittingTheFile) {
		return importReturnString;
	}

	if (isDevelopmentMode) {
		if (pictureSources.length !== 1 || pictureSources[0].__sharpEntries.length !== 1) {
			throw new Error('Expected only one source and one sharpEntry while in the development mode.');
		}

		const theOnlySharpEntry = pictureSources[0].__sharpEntries[0];
		this.emitFile(theOnlySharpEntry.filepath, imageBuffer);
		return importReturnString;
	}

	const exportFunction = (optimizedImageBuffer: Buffer, filepath: string) => {
		this.emitFile(filepath, optimizedImageBuffer);
		return Promise.resolve();
	};

	const getCacheFunction = (cacheKey: string) => {
		return cache.getItemRaw<Buffer>(cacheKey);
	};

	const setCacheFunction = async (cacheKey: string, optimizedImageBuffer: Buffer) => {
		await cache.setItemRaw(cacheKey, optimizedImageBuffer);
	};

	await optimizePictureSources(imageBuffer, pictureSources, exportFunction, getCacheFunction, setCacheFunction, sharp, imageFilename);

	return importReturnString;
};

export const raw = true;
export default localStaticImageLoader;
