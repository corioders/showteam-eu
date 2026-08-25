// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";

import { PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY } from "./prerendered-image-resource.js";

const DEVELOPMENT_ASSET_MARKER = ".development.";

/** Removes build-owned production output while preserving files used by a running next dev process. */
export async function cleanPrerenderedImageProductionOutput(projectDirectory: string = process.cwd()): ErrorReturnPromise<void> {
	const imageDirectory = path.join(projectDirectory, "public/_cstd/image");
	const [imageEntries, imageDirectoryError] = await readDirectoryIfPresent(imageDirectory);
	if (imageDirectoryError !== null) {
		return [null, imageDirectoryError];
	}

	const productionPaths = [
		...imageEntries.filter((entry) => entry.isFile() && !entry.name.includes(DEVELOPMENT_ASSET_MARKER)).map((entry) => path.join(imageDirectory, entry.name)),
		path.join(imageDirectory, "asset/production"),
		path.join(imageDirectory, "descriptor"),
		path.join(imageDirectory, "remote-descriptor"),
		path.join(projectDirectory, PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY),
	];
	const [_, removalError] = await safePromise(() => Promise.all(productionPaths.map((productionPath) => fs.rm(productionPath, { force: true, recursive: true }))));
	if (removalError !== null) {
		return [null, new Error(`Unable to clean production prerendered images in ${imageDirectory}`, { cause: removalError })];
	}

	return [undefined, null];
}

async function readDirectoryIfPresent(directory: string): ErrorReturnPromise<Dirent[]> {
	const [entries, error] = await safePromise(() => fs.readdir(directory, { withFileTypes: true }));
	if (error === null) {
		return [entries, null];
	}
	if (isMissingPathError(error)) {
		return [[], null];
	}

	return [null, new Error(`Unable to read image output directory ${directory}`, { cause: error })];
}

function isMissingPathError(error: Error): boolean {
	return "code" in error && error.code === "ENOENT";
}
