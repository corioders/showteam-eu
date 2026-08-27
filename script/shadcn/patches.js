import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { run } from "./session.js";

const PATCH_FORMAT_VERSION = 1;
const SHADCNBLOCKS_ITEM = /^@shadcnblocks\/[A-Za-z0-9._-]+$/;

function hashFile(filePath) {
	return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function patchBaseName(registryItem) {
	return registryItem.slice(1).replaceAll("/", "__");
}

function patchPaths(patchDirectory, registryItem) {
	const baseName = patchBaseName(registryItem);
	return {
		manifestPath: path.join(patchDirectory, `${baseName}.json`),
		patchPath: path.join(patchDirectory, `${baseName}.patch`),
	};
}

function createFilePatch(baselinePath, currentPath, relativePath, cwd) {
	const result = run("git", ["diff", "--no-index", "--no-prefix", "--", baselinePath, currentPath], {
		allowFailure: true,
		capture: true,
		cwd,
	});
	if (result.status !== 1 || result.stdout.length === 0) {
		return [null, new Error(`Could not create a patch for ${relativePath}.`)];
	}

	const lines = result.stdout.split("\n");
	lines[0] = `diff --git a/${relativePath} b/${relativePath}`;
	const oldFileHeader = lines.findIndex((line) => line.startsWith("--- "));
	const newFileHeader = lines.findIndex((line) => line.startsWith("+++ "));
	if (oldFileHeader === -1 || newFileHeader === -1) {
		return [null, new Error(`Git produced an invalid patch for ${relativePath}.`)];
	}
	lines[oldFileHeader] = `--- a/${relativePath}`;
	lines[newFileHeader] = `+++ b/${relativePath}`;
	return [lines.join("\n"), null];
}

function verifyPatch(baselineRoot, currentRoot, sourceFiles, changedFiles, patch) {
	const verificationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cstd-shadcn-patch-"));
	const verificationPatch = path.join(verificationRoot, "learned.patch");
	try {
		for (const relativePath of sourceFiles) {
			const target = path.join(verificationRoot, relativePath);
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.copyFileSync(path.join(baselineRoot, relativePath), target);
		}
		fs.writeFileSync(verificationPatch, patch);
		const applyResult = run("git", ["apply", "--check", "--whitespace=nowarn", verificationPatch], {
			allowFailure: true,
			capture: true,
			cwd: verificationRoot,
		});
		if (applyResult.status !== 0) {
			return new Error("The generated patch does not apply to its own clean baseline.");
		}
		run("git", ["apply", "--whitespace=nowarn", verificationPatch], { cwd: verificationRoot });
		for (const relativePath of changedFiles) {
			if (!fs.readFileSync(path.join(verificationRoot, relativePath)).equals(fs.readFileSync(path.join(currentRoot, relativePath)))) {
				return new Error(`The generated patch does not fully reproduce ${relativePath}.`);
			}
		}
		return null;
	} finally {
		fs.rmSync(verificationRoot, { force: true, recursive: true });
	}
}

export function registryItemsFromArguments(arguments_) {
	return [...new Set(arguments_.filter((argument) => SHADCNBLOCKS_ITEM.test(argument)))];
}

export function writeLearnedPatch({ baselineRoot, currentRoot, patchDirectory, registryItem, sourceFiles }) {
	if (!SHADCNBLOCKS_ITEM.test(registryItem)) {
		return [null, new Error(`Unsupported registry item: ${registryItem}`)];
	}

	const changedFiles = [];
	const patches = [];
	for (const relativePath of sourceFiles) {
		const baselinePath = path.join(baselineRoot, relativePath);
		const currentPath = path.join(currentRoot, relativePath);
		if (!fs.existsSync(baselinePath) || !fs.existsSync(currentPath)) {
			return [null, new Error(`Learned patches cannot add or delete files: ${relativePath}`)];
		}
		if (fs.readFileSync(baselinePath).equals(fs.readFileSync(currentPath))) {
			continue;
		}
		const [filePatch, patchError] = createFilePatch(baselinePath, currentPath, relativePath, currentRoot);
		if (patchError) {
			return [null, patchError];
		}
		changedFiles.push(relativePath);
		patches.push(filePatch);
	}

	if (changedFiles.length === 0) {
		return [null, new Error("No compatibility fixes found after the latest Shadcnblocks install.")];
	}

	const patch = patches.join("\n");
	const verificationError = verifyPatch(baselineRoot, currentRoot, sourceFiles, changedFiles, patch);
	if (verificationError) {
		return [null, verificationError];
	}

	const baselineHashes = Object.fromEntries(sourceFiles.map((relativePath) => [relativePath, hashFile(path.join(baselineRoot, relativePath))]));
	const { manifestPath, patchPath } = patchPaths(patchDirectory, registryItem);
	fs.mkdirSync(patchDirectory, { recursive: true });
	fs.writeFileSync(patchPath, patch);
	fs.writeFileSync(manifestPath, `${JSON.stringify({ formatVersion: PATCH_FORMAT_VERSION, registryItem, baselineHashes, changedFiles }, null, "\t")}\n`);
	return [{ changedFiles, manifestPath, patchPath }, null];
}

export function applyLearnedPatch({ cwd, patchDirectory, registryItem }) {
	const { manifestPath, patchPath } = patchPaths(patchDirectory, registryItem);
	const manifestExists = fs.existsSync(manifestPath);
	const patchExists = fs.existsSync(patchPath);
	if (!manifestExists && !patchExists) {
		return { status: "missing" };
	}
	if (!manifestExists || !patchExists) {
		return { error: `Learned patch files are incomplete for ${registryItem}.`, status: "invalid" };
	}

	let manifest;
	try {
		manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	} catch {
		return { error: `Learned patch manifest is invalid for ${registryItem}.`, status: "invalid" };
	}
	if (manifest.formatVersion !== PATCH_FORMAT_VERSION || manifest.registryItem !== registryItem || typeof manifest.baselineHashes !== "object") {
		return { error: `Learned patch manifest is invalid for ${registryItem}.`, status: "invalid" };
	}

	for (const [relativePath, expectedHash] of Object.entries(manifest.baselineHashes)) {
		const installedPath = path.join(cwd, relativePath);
		if (!fs.existsSync(installedPath) || hashFile(installedPath) !== expectedHash) {
			return { error: `${registryItem} changed upstream at ${relativePath}; revalidate it and run pnpm shadcn:learn.`, status: "stale" };
		}
	}

	const checkResult = run("git", ["apply", "--check", "--whitespace=nowarn", patchPath], { allowFailure: true, capture: true, cwd });
	if (checkResult.status !== 0) {
		return { error: `Learned patch no longer applies cleanly for ${registryItem}; revalidate it and run pnpm shadcn:learn.`, status: "stale" };
	}
	run("git", ["apply", "--whitespace=nowarn", patchPath], { cwd });
	return { changedFiles: manifest.changedFiles, status: "applied" };
}
