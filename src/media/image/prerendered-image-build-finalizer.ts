// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { OptimizedImageDescriptor } from "./optimized-image.jsx";
import { PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY, PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER, PRERENDERED_IMAGE_MARKER_ATTRIBUTE } from "./prerendered-image-resource.js";

const MANIFEST_KEY_PATTERN = "[a-f0-9]{32}";
const MANIFEST_KEY_REGEX = new RegExp(`${PRERENDERED_IMAGE_MARKER_ATTRIBUTE}="(${MANIFEST_KEY_PATTERN})"`, "g");
const MANIFEST_HTML_MARKER_REGEX = new RegExp(`\\s+${PRERENDERED_IMAGE_MARKER_ATTRIBUTE}="${MANIFEST_KEY_PATTERN}"`, "g");
const MANIFEST_FLIGHT_MARKER_REGEX = new RegExp(`"${PRERENDERED_IMAGE_MARKER_ATTRIBUTE}":"${MANIFEST_KEY_PATTERN}",?`, "g");
const MANIFEST_EMBEDDED_FLIGHT_MARKER_REGEX = new RegExp(String.raw`\\"${PRERENDERED_IMAGE_MARKER_ATTRIBUTE}\\":\\"${MANIFEST_KEY_PATTERN}\\",?`, "g");

interface RequiredServerFiles {
	config?: {
		outputFileTracingRoot?: unknown;
	};
}

export async function finalizePrerenderedImageBuild(projectDirectory: string): Promise<void> {
	const primaryDistDirectory = path.join(projectDirectory, ".next");
	const outputDirectories = [primaryDistDirectory];
	const standaloneDistDirectory = await getStandaloneDistDirectory(projectDirectory, primaryDistDirectory);
	if (standaloneDistDirectory !== null) {
		outputDirectories.push(standaloneDistDirectory);
	}

	for (const outputDirectory of outputDirectories) {
		const appOutputDirectory = path.join(outputDirectory, "server/app");
		const htmlFiles = await findFiles(appOutputDirectory, (filename) => filename.endsWith(".html"));
		for (const htmlFile of htmlFiles) {
			await injectRouteManifest(projectDirectory, htmlFile);
		}
	}
}

async function getStandaloneDistDirectory(projectDirectory: string, primaryDistDirectory: string): Promise<string | null> {
	const requiredServerFiles = JSON.parse(await fs.readFile(path.join(primaryDistDirectory, "required-server-files.json"), "utf8")) as RequiredServerFiles;
	const configuredTracingRoot = requiredServerFiles.config?.outputFileTracingRoot;
	const tracingRoot = typeof configuredTracingRoot === "string" ? configuredTracingRoot : projectDirectory;
	const standaloneDistDirectory = path.join(primaryDistDirectory, "standalone", path.relative(tracingRoot, projectDirectory), ".next");
	return (await pathExists(path.join(standaloneDistDirectory, "server/app"))) ? standaloneDistDirectory : null;
}

async function injectRouteManifest(projectDirectory: string, htmlFile: string): Promise<void> {
	const html = await fs.readFile(htmlFile, "utf8");
	const keys = Array.from(html.matchAll(MANIFEST_KEY_REGEX), (match) => match[1]).filter((key): key is string => key !== undefined);
	const uniqueKeys = [...new Set(keys)];
	if (uniqueKeys.length === 0) {
		return;
	}
	if (!html.includes(PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER)) {
		// biome-ignore lint/plugin/no-throw: The postbuild command must exit nonzero when the page loader contract is missing.
		throw new Error(`Route ${htmlFile} renders prerendered images but its page was not wrapped by the cstd-next Turbopack manifest loader.`);
	}

	const manifest = await readRouteManifest(projectDirectory, uniqueKeys);
	const encodedManifest = Buffer.from(JSON.stringify(manifest)).toString("base64");
	const finalHtml = removeManifestMarkers(html.replaceAll(PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER, encodedManifest));
	await fs.writeFile(htmlFile, finalHtml);

	const routeOutputBase = htmlFile.slice(0, -".html".length);
	const routeRscFile = `${routeOutputBase}.rsc`;
	const segmentDirectory = `${routeOutputBase}.segments`;
	const segmentFiles = await findFiles(segmentDirectory, (filename) => filename.endsWith(".rsc"));
	const rscFiles = [routeRscFile, ...segmentFiles];

	let patchedRscFiles = 0;
	for (const rscFile of rscFiles) {
		if (await patchRscFile(rscFile, encodedManifest)) {
			patchedRscFiles += 1;
		}
	}
	if (patchedRscFiles === 0) {
		// biome-ignore lint/plugin/no-throw: The postbuild command must exit nonzero when Next's RSC output contract changed.
		throw new Error(`Route ${htmlFile} renders prerendered images but no associated RSC output contains the cstd-next image manifest placeholder.`);
	}
}

async function readRouteManifest(projectDirectory: string, keys: string[]): Promise<Record<string, OptimizedImageDescriptor>> {
	const manifest: Record<string, OptimizedImageDescriptor> = {};
	for (const key of keys) {
		const descriptorFile = path.join(projectDirectory, PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY, `${key}.json`);
		const descriptor = await fs.readFile(descriptorFile, "utf8");
		manifest[key] = JSON.parse(descriptor) as OptimizedImageDescriptor;
	}
	return manifest;
}

async function patchRscFile(filename: string, encodedManifest: string): Promise<boolean> {
	const source = await fs.readFile(filename, "utf8");
	const containsPlaceholder = source.includes(PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER);
	const finalSource = removeManifestMarkers(source.replaceAll(PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER, encodedManifest));
	if (finalSource !== source) {
		await fs.writeFile(filename, finalSource);
	}
	return containsPlaceholder;
}

function removeManifestMarkers(source: string): string {
	return source.replace(MANIFEST_HTML_MARKER_REGEX, "").replace(MANIFEST_FLIGHT_MARKER_REGEX, "").replace(MANIFEST_EMBEDDED_FLIGHT_MARKER_REGEX, "");
}

async function findFiles(directory: string, predicate: (filename: string) => boolean): Promise<string[]> {
	let entries: Dirent[];
	try {
		entries = await fs.readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (isMissingPathError(error)) {
			return [];
		}
		// biome-ignore lint/plugin/no-throw: Unexpected filesystem failures must reject the postbuild command with their original details.
		throw error;
	}

	const files: string[] = [];
	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await findFiles(entryPath, predicate)));
		} else if (entry.isFile() && predicate(entry.name)) {
			files.push(entryPath);
		}
	}
	return files;
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function pathExists(filename: string): Promise<boolean> {
	try {
		await fs.access(filename);
		return true;
	} catch (error) {
		if (isMissingPathError(error)) {
			return false;
		}
		// biome-ignore lint/plugin/no-throw: Unexpected filesystem failures must reject the postbuild command with their original details.
		throw error;
	}
}
