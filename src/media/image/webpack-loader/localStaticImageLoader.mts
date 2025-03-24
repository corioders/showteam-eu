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
	type ImageInfo,
	type PictureSource,
	getPictureSourcesNotSvg,
	getSvgEntry,
	hash,
	inferHeight,
	optimizePictureSources,
	optimizeSvg,
	readImageInfoFromBuffer,
	shouldOptimizeImages,
	validateInferredWidth,
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

	// Either i and s are present OR g is present. Never both

	// Is size specified by the user in the loader query.
	i?: boolean;

	// Optimized sources of the image.
	s?: INTERNAL_LowOverheadPictureSource[];

	// src of the svG image
	g?: string;
}

// biome-ignore lint/style/useNamingConvention: We want to emphasize this is an internal interface
interface INTERNAL_LowOverheadPictureSource {
	// if `i` is set this is the src of the image, otherwise this is the srcSet of the image.
	s: string;

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

const RESOURCE_QUERY_REGEX = /\?w=(?<width>\d+)\.scaled/;

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

	let userSpecifiedWidth: number | undefined = undefined;
	const matchedResourceQuery = this.resourceQuery.match(RESOURCE_QUERY_REGEX);
	if (matchedResourceQuery?.groups?.width) {
		userSpecifiedWidth = Number(matchedResourceQuery?.groups?.width);
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
	if (options.isServer && !userSpecifiedWidth) {
		shouldSkipEmittingTheFile = true;
	}

	// Okay, this is even funnier. When the image with a resourceQuery is used on
	// a 'use client' route, then it is webpack loaded by both the server-phase and the client-phase.
	// For now let's say we stick to the server-phase so we skip the optim while we're on the client.
	if (!options.isServer && userSpecifiedWidth) {
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

	let { width, height } = imageInfo;
	if (userSpecifiedWidth) {
		height = inferHeight(width, height, userSpecifiedWidth);
		width = userSpecifiedWidth;
	}

	if (imageInfo.type === 'svg') {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo, pathPrefix);
		const importReturn: INTERNAL_LocalStaticImageImport = {
			contentHash: imageSpecificHash,
			filename: imageFilename,
			w: width,
			h: height,
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

	const pictureSources = getPictureSourcesNotSvg(isDevelopmentMode, imageFilename, imageSpecificHash, imageInfo, pathPrefix, userSpecifiedWidth);
	const loPictureSources: INTERNAL_LowOverheadPictureSource[] = pictureSources.map((ps) => ({ s: ps.srcSetORsrc, t: ps.type }));

	const importReturn: INTERNAL_LocalStaticImageImport = {
		contentHash: imageSpecificHash,
		filename: imageFilename,
		i: !!userSpecifiedWidth,
		w: width,
		h: height,
		s: loPictureSources,
	};
	const importReturnString = `export default ${JSON.stringify(importReturn)}`;

	// We are optimizing images only while building client.
	if (shouldSkipEmittingTheFile) {
		return importReturnString;
	}

	// TODO: Figure out if we'd like to rescale the images as the user requested in the ?w query.
	if (isDevelopmentMode) {
		if (pictureSources.length !== 1 || pictureSources[0].__sharpEntries.length !== 1) {
			throw new Error('Expected only one source and one sharpEntry while in the development mode.');
		}

		const theOnlySharpEntry = pictureSources[0].__sharpEntries[0];
		this.emitFile(theOnlySharpEntry.filepath, imageBuffer);
		return importReturnString;
	}

	const exportFunction = (optimizedImageBuffer: Buffer, filepath: string, targetImageInfo?: ImageInfo) => {
		if (targetImageInfo) {
			validateInferredWidth({ userSpecifiedWidth, inferredHeight: height }, targetImageInfo.height);
		}

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
