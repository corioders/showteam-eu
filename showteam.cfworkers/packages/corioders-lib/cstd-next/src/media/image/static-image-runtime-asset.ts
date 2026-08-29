// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import * as svgo from "svgo";

import { optimizeSvg } from "./internal.js";
import type { OptimizedImageDescriptor } from "./optimized-image.jsx";

export const STATIC_IMAGE_SOURCE_DIRECTORY = ".next/cache/corioders/cstd-next-local-static-image/source";
export const STATIC_IMAGE_RUNTIME_ASSET_DIRECTORY = "public/_cstd/image/asset/runtime";
const RUNTIME_ASSET_URL_PREFIX = "/_cstd/image/asset/runtime";
const RUNTIME_WEBP_OPTIONS = { effort: 2, quality: 80, smartSubsample: true } as const;

export async function writeStaticImageRuntimeAsset(projectDirectory: string, contentHash: string, imageBuffer: Buffer): Promise<OptimizedImageDescriptor> {
	const runtimeAssetDirectory = path.join(projectDirectory, STATIC_IMAGE_RUNTIME_ASSET_DIRECTORY);
	await fs.mkdir(runtimeAssetDirectory, { recursive: true });
	const sourceMetadata = await sharp(imageBuffer, { animated: true }).metadata();
	if (sourceMetadata.format === "svg") {
		const runtimeFilename = `${contentHash}.svg`;
		const width = sourceMetadata.width;
		const height = sourceMetadata.height;
		if (!(typeof width === "number" && width > 0 && typeof height === "number" && height > 0)) {
			// biome-ignore lint/plugin/no-throw: A Turbopack image loader must reject invalid source metadata.
			throw new Error(`Sharp returned invalid SVG dimensions: ${width}x${height}`);
		}
		await fs.writeFile(path.join(runtimeAssetDirectory, runtimeFilename), optimizeSvg(false, imageBuffer.toString(), svgo));
		return { contentHash, height, img: { src: `${RUNTIME_ASSET_URL_PREFIX}/${runtimeFilename}` }, width };
	}

	const runtimeFilename = `${contentHash}.webp`;
	const runtimeAssetData = await sharp(imageBuffer, { animated: true }).rotate().webp(RUNTIME_WEBP_OPTIONS).toBuffer();
	const metadata = await sharp(runtimeAssetData, { animated: true }).metadata();
	const width = metadata.width;
	const height = metadata.pageHeight ?? metadata.height;
	if (!(typeof width === "number" && width > 0 && typeof height === "number" && height > 0)) {
		// biome-ignore lint/plugin/no-throw: A Turbopack image loader must reject invalid generated metadata.
		throw new Error(`Sharp returned invalid runtime image dimensions: ${width}x${height}`);
	}
	await fs.writeFile(path.join(runtimeAssetDirectory, runtimeFilename), runtimeAssetData);
	return { contentHash, height, img: { src: `${RUNTIME_ASSET_URL_PREFIX}/${runtimeFilename}` }, width };
}
