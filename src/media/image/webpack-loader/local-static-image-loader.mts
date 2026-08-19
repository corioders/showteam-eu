// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { createHash } from "node:crypto";
import path, { join } from "node:path";

import { parseDotEnv } from "cstd-ts/runtime/env.js";
import sharp from "sharp";
import * as svgo from "svgo";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs-lite";
import type { LoaderDefinitionFunction } from "webpack";

import {
	calculateImageSizeFromUserSpecifiedNoSVG,
	getPictureSourcesNotSvg,
	getSvgEntry,
	hash,
	optimizePictureSources,
	optimizeSvg,
	type PictureSource,
	readImageInfoFromBuffer,
	shouldOptimizeImages,
	type UserSpecified,
	validateUserSpecified,
} from "../internal.mjs";

const cache = createStorage({ driver: fsDriver({ base: ".next/cache/corioders/cstd-next-local-static-image" }) });

export interface LocalStaticImageImport {
	// Hash of the original image. Can be used inside the react key prop.
	contentHash: string;
	// Filename of the original image without extension.
	filename: string;
}

// biome-ignore lint/style/useNamingConvention: This is an internal structure. Naming convention is omitted
export interface INTERNAL_LocalStaticImageImport extends LocalStaticImageImport {
	// Width of the image. Width is specified by user in the import query or taken from the original image.
	w: number;
	// Height of the image. Height is either inferred from the user specified width or or taken from the original image.
	h: number;

	// Either o or/and s are present OR g is present. Never both

	// siZes of the image. When the user specifies width or height in the loader query, then the corresponding WIDTH is put into this z
	z?: string;

	// Optimized sources of the image.
	s?: InternalLowOverheadPictureSource[];

	// src of the svG image
	g?: string;
}

interface InternalLowOverheadPictureSource {
	// The srcSet of the image.
	s: string;

	// The fallback sRc of the image
	r: string;

	// Type of the picture source.
	t: PictureSource["type"];
}

interface Options {
	isDev: boolean;
	isServer: boolean;
	isEdgeServer: boolean;
}

const RESOURCE_QUERY_WIDTH_REGEX = /\?w=(?<width>\d+)\.scaled/;
const RESOURCE_QUERY_HEIGHT_REGEX = /\?h=(?<height>\d+)\.scaled/;

const RESOURCE_QUERY_WIDTH_ARRAY_REGEX = /\?w=(?<width>\[[\d+|,| ]*\])\.scaled/;
const RESOURCE_QUERY_HEIGHT_ARRAY_REGEX = /\?h=(?<height>\[[\d+|,| ]*\])\.scaled/;

const NEXTJS_CLIENT_BUILD_FILEPATH_PREFIX = "static/media";
const NEXTJS_SERVER_BUILD_FILEPATH_PREFIX = "../../static/media";
const NEXTJS_SERVER_DEV_FILEPATH_PREFIX = "../static/media";

const EMITTED_FILES = new Set<string>();
const PARSED_DOTENV_CACHE = new Map<string, Record<string, string>>();

// TODO: BLUUUR
//
// TODO: If the resourceQuery issue will not be resolved
// move all of the optim to be done during the server-phase.
// Having a split mind is not a good thing.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
const localStaticImageLoader: LoaderDefinitionFunction = async function localStaticImageLoader(this, contentNotRawType) {
	this.cacheable(true);

	// The 'optimizePictureSources' and 'getPictureSourcesNotSvg' internal functions are using the .env variable 'CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER'
	// We need to tell webpack that this loader is dependent on the .env file
	const root = this.rootContext || process.cwd();
	const envFilePath = join(root, ".env");
	this.addDependency(envFilePath);
	this.addMissingDependency(envFilePath);

	// ==================================================
	// Here unfortunately we need to reload the contents of .env ourselves. Nextjs is too slow.
	// Next will reload these files and update process.env but only AFTER this loader has finished,
	// so the user would need to update .env twice for this loader to notice the change in CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER
	// This is why we reload it here.
	const envFileContents = await new Promise<Buffer | false>((resolve) => {
		this.fs.readFile(envFilePath, (err, result) => {
			if (err) {
				if (err.code === "ENOENT") {
					resolve(false);
					return;
				}

				throw new Error(`local-static-image-loader: Unable to read .env file: ${err.message}`, { cause: err });
			}

			if (!result) {
				throw new Error("local-static-image-loader: Unable to read .env file");
			}

			resolve(result);
		});
	});

	// Env file does not exist. We are in a ci pipeline or the env is already set.
	if (!envFileContents) {
		const envFileContentsString = envFileContents.toString();
		let parsedDotEnv = PARSED_DOTENV_CACHE.get(envFileContentsString);
		if (!parsedDotEnv) {
			parsedDotEnv = parseDotEnv(envFileContentsString);
			PARSED_DOTENV_CACHE.set(envFileContentsString, parsedDotEnv);
		}

		process.env["CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER"] = parsedDotEnv["CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER"];
	}

	// ==================================================

	const imageBuffer = contentNotRawType as unknown as Buffer;
	const options = this.getOptions() as Options;
	const isDevelopmentMode = options.isDev || !shouldOptimizeImages();

	let userSpecified: undefined | UserSpecified;
	if (this.resourceQuery) {
		const widthSpecified = this.resourceQuery.match(RESOURCE_QUERY_WIDTH_REGEX)?.groups?.width;
		const heightSpecified = this.resourceQuery.match(RESOURCE_QUERY_HEIGHT_REGEX)?.groups?.height;

		const widthArraySpecified = this.resourceQuery.match(RESOURCE_QUERY_WIDTH_ARRAY_REGEX)?.groups?.width;
		const heightArraySpecified = this.resourceQuery.match(RESOURCE_QUERY_HEIGHT_ARRAY_REGEX)?.groups?.height;

		if (widthSpecified || heightSpecified) {
			userSpecified = {
				height: heightSpecified ? Number(heightSpecified) : undefined,
				width: widthSpecified ? Number(widthSpecified) : undefined,
			};
		}

		if (widthArraySpecified || heightArraySpecified) {
			userSpecified = {
				height: heightArraySpecified ? JSON.parse(heightArraySpecified) : undefined,
				width: widthArraySpecified ? JSON.parse(widthArraySpecified) : undefined,
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
	let skipEmit = false;
	if (options.isServer && !userSpecified) {
		skipEmit = true;
	}

	// Okay, this is even funnier. When the image with a resourceQuery is used on
	// a 'use client' route, then it is webpack loaded by both the server-phase and the client-phase.
	// For now let's say we stick to the server-phase so we skip the optim while we're on the client.
	if (!options.isServer && userSpecified) {
		skipEmit = true;
	}

	if (options.isEdgeServer) {
		skipEmit = true;
	}

	let pathPrefix = NEXTJS_CLIENT_BUILD_FILEPATH_PREFIX;
	if (options.isServer && !skipEmit) {
		pathPrefix = NEXTJS_SERVER_BUILD_FILEPATH_PREFIX;
	}
	if (options.isServer && !skipEmit && options.isDev) {
		pathPrefix = NEXTJS_SERVER_DEV_FILEPATH_PREFIX;
	}

	// ==================================================
	// ==================================================

	const imageSpecificHash = hash(imageBuffer, createHash);
	const imageFilename = path.basename(this.resourcePath);
	const imageInfo = await readImageInfoFromBuffer(imageBuffer, sharp);

	if (imageInfo.type === "svg") {
		const svgEntry = getSvgEntry(imageFilename, imageSpecificHash, imageInfo, pathPrefix);
		const importReturn: INTERNAL_LocalStaticImageImport = {
			contentHash: imageSpecificHash,
			filename: imageFilename,
			g: svgEntry.src,
			h: imageInfo.height,

			w: imageInfo.width,
		};
		const importReturnString = `export default ${JSON.stringify(importReturn)}`;

		if (skipEmit) {
			return importReturnString;
		}

		const optimizedSvg = optimizeSvg(isDevelopmentMode, imageBuffer.toString(), svgo);
		this.emitFile(svgEntry.filepath, optimizedSvg);

		return importReturnString;
	}

	const { imageSizeToSetAtTheImgElement, inferredSizes } = calculateImageSizeFromUserSpecifiedNoSVG(imageInfo, userSpecified);

	const pictureSources = getPictureSourcesNotSvg(isDevelopmentMode, imageFilename, imageSpecificHash, imageInfo, pathPrefix, userSpecified);
	const loPictureSources: InternalLowOverheadPictureSource[] = pictureSources.map((ps) => ({ r: ps.fallbackSrc, s: ps.srcSet, t: ps.type }));

	const importReturn: INTERNAL_LocalStaticImageImport = {
		contentHash: imageSpecificHash,
		filename: imageFilename,
		h: imageSizeToSetAtTheImgElement.height,
		s: loPictureSources,

		w: imageSizeToSetAtTheImgElement.width,
		z: inferredSizes,
	};
	const importReturnString = `export default ${JSON.stringify(importReturn)}`;

	// We are optimizing images only while building client.
	if (skipEmit) {
		return importReturnString;
	}

	const exportFunction = (optimizedImageBuffer: Buffer, filepath: string) => {
		if (EMITTED_FILES.has(filepath)) {
			return Promise.resolve();
		}

		EMITTED_FILES.add(filepath);
		this.emitFile(filepath, optimizedImageBuffer, undefined, {});
		return Promise.resolve();
	};

	const getCacheFunction = (cacheKey: string) => {
		return cache.getItemRaw<Buffer>(cacheKey);
	};

	const setCacheFunction = async (cacheKey: string, optimizedImageBuffer: Buffer) => {
		await cache.setItemRaw(cacheKey, optimizedImageBuffer);
	};

	await optimizePictureSources(isDevelopmentMode, imageBuffer, pictureSources, exportFunction, getCacheFunction, setCacheFunction, sharp, imageFilename);

	return importReturnString;
};

export const raw = true;
// biome-ignore lint/style/noDefaultExport: This default export is required because we are interacting with webpack
export default localStaticImageLoader;
