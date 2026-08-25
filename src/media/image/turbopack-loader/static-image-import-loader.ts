// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import * as svgo from "svgo";

import { hash, optimizeSvg } from "../internal.js";
import type { StaticImageImport } from "../static-image-import.js";

const SOURCE_DIRECTORY = ".next/cache/corioders/cstd-next-local-static-image/source";
const DEVELOPMENT_ASSET_DIRECTORY = "public/_cstd/image/asset/development";
const DEVELOPMENT_ASSET_URL_PREFIX = "/_cstd/image/asset/development";
const DEVELOPMENT_WEBP_OPTIONS = { effort: 2, quality: 80, smartSubsample: true } as const;
const RUNTIME_ASSET_DIRECTORY = "public/_cstd/image/asset/runtime";
const RUNTIME_ASSET_URL_PREFIX = "/_cstd/image/asset/runtime";

interface TurbopackLoaderContext {
	cacheable(cacheable: boolean): void;
	resourcePath: string;
	resourceQuery: string;
}

const staticImageImportLoader = async function staticImageImportLoader(this: TurbopackLoaderContext, imageBuffer: Buffer) {
	this.cacheable(true);

	if (this.resourceQuery) {
		// biome-ignore lint/plugin/no-throw: Turbopack loaders must reject unsupported import syntax.
		throw new Error(`Image import queries are not supported: ${this.resourceQuery}. Configure generated candidates with the StaticImage sizes prop.`);
	}

	const contentHash = hash(imageBuffer, createHash);
	const sourceDirectory = path.join(process.cwd(), SOURCE_DIRECTORY);
	await fs.mkdir(sourceDirectory, { recursive: true });
	await fs.writeFile(path.join(sourceDirectory, contentHash), imageBuffer);

	const source: StaticImageImport = {
		src: `cstd-local://${contentHash}/${encodeURIComponent(path.basename(this.resourcePath))}`,
	};
	const runtimeAssetDirectory = path.join(process.cwd(), RUNTIME_ASSET_DIRECTORY);
	await fs.mkdir(runtimeAssetDirectory, { recursive: true });
	const sourceMetadata = await sharp(imageBuffer, { animated: true }).metadata();
	if (sourceMetadata.format === "svg") {
		const runtimeFilename = `${contentHash}.svg`;
		const width = sourceMetadata.width;
		const height = sourceMetadata.height;
		if (!(typeof width === "number" && width > 0 && typeof height === "number" && height > 0)) {
			// biome-ignore lint/plugin/no-throw: A Turbopack loader must reject an invalid source module.
			throw new Error(`Sharp returned invalid SVG dimensions: ${width}x${height}`);
		}
		await fs.writeFile(path.join(runtimeAssetDirectory, runtimeFilename), optimizeSvg(false, imageBuffer.toString(), svgo));
		source.runtimeAsset = { contentHash, height, img: { src: `${RUNTIME_ASSET_URL_PREFIX}/${runtimeFilename}` }, width };
	} else {
		const runtimeFilename = `${contentHash}.webp`;
		const runtimeAssetData = await sharp(imageBuffer, { animated: true }).rotate().webp(DEVELOPMENT_WEBP_OPTIONS).toBuffer();
		const metadata = await sharp(runtimeAssetData, { animated: true }).metadata();
		const width = metadata.width;
		const height = metadata.pageHeight ?? metadata.height;
		if (!(typeof width === "number" && width > 0 && typeof height === "number" && height > 0)) {
			// biome-ignore lint/plugin/no-throw: A Turbopack loader must reject an invalid source module.
			throw new Error(`Sharp returned invalid runtime image dimensions: ${width}x${height}`);
		}
		await fs.writeFile(path.join(runtimeAssetDirectory, runtimeFilename), runtimeAssetData);
		source.runtimeAsset = { contentHash, height, img: { src: `${RUNTIME_ASSET_URL_PREFIX}/${runtimeFilename}` }, width };
	}
	if (process.env.NODE_ENV === "development") {
		const developmentAssetData = await sharp(imageBuffer, { animated: true }).rotate().webp(DEVELOPMENT_WEBP_OPTIONS).toBuffer();
		const metadata = await sharp(developmentAssetData, { animated: true }).metadata();
		const width = metadata.width;
		const height = metadata.pageHeight ?? metadata.height;
		if (!(typeof width === "number" && Number.isInteger(width) && width > 0 && typeof height === "number" && Number.isInteger(height) && height > 0)) {
			// biome-ignore lint/plugin/no-throw: Invalid loader metadata must fail through the Turbopack build boundary.
			throw new Error(`Sharp returned invalid development image dimensions: ${width}x${height}`);
		}

		const developmentAssetDirectory = path.join(process.cwd(), DEVELOPMENT_ASSET_DIRECTORY);
		const developmentFilename = `${contentHash}.webp`;
		await fs.mkdir(developmentAssetDirectory, { recursive: true });
		await fs.writeFile(path.join(developmentAssetDirectory, developmentFilename), developmentAssetData);
		source.developmentAsset = {
			height,
			src: `${DEVELOPMENT_ASSET_URL_PREFIX}/${developmentFilename}`,
			width,
		};
	}
	return `export default ${JSON.stringify(source)}`;
};

export const raw = true;
// biome-ignore lint/style/noDefaultExport: Turbopack loader API requires a default export.
export default staticImageImportLoader;
