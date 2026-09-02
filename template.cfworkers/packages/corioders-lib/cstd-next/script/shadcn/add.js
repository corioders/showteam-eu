#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { synchronizeCanonicalShadcnNormalization } from "./canonical.js";
import { normalizeShadcnSource } from "./codemods.js";
import { applyLearnedPatch, readShadcnStyle, registryItemsFromArguments } from "./patches.js";
import { changedFiles, copyFiles, getSessionDirectory, loadLocalEnvironment, NORMALIZED_EXTENSIONS, replaceDirectory, run, snapshotFiles } from "./session.js";

const cwd = process.cwd();
loadLocalEnvironment(cwd);
const commandArguments = process.argv.slice(2);
const canonicalAlreadySynchronized = commandArguments[0] === "--cstd-canonical-synchronized";
const shadcnArguments = canonicalAlreadySynchronized ? commandArguments.slice(1) : commandArguments;
if (shadcnArguments.length === 0) {
	console.error("usage: pnpm shadcn:add <registry-item> [...shadcn-options]");
	process.exit(1);
}
const registryItems = registryItemsFromArguments(shadcnArguments);
const cstdNextRoot = path.resolve(import.meta.dirname, "..", "..");
const gitRoot = run("git", ["rev-parse", "--show-toplevel"], { capture: true, cwd }).stdout.trim();
if (!canonicalAlreadySynchronized) {
	const canonicalSynchronization = synchronizeCanonicalShadcnNormalization({ cstdNextRoot, gitRoot });
	if (canonicalSynchronization.error !== null) {
		console.error(canonicalSynchronization.error.message);
		process.exit(1);
	}
	if (canonicalSynchronization.status === "updated") {
		console.log("Pulled the fast-forward canonical cstd-next update; restarting shadcn:add with the updated compatibility rules.");
		const restarted = run(process.execPath, [import.meta.filename, "--cstd-canonical-synchronized", ...shadcnArguments], {
			allowFailure: true,
			cwd,
		});
		process.exit(restarted.status ?? 1);
	}
}
const [style, styleError] = readShadcnStyle(cwd);
if (styleError) {
	console.error(styleError.message);
	process.exit(1);
}

const before = snapshotFiles(cwd);
const installResult = run("pnpm", ["dlx", "shadcn@latest", "add", "--silent", ...shadcnArguments], {
	allowFailure: true,
	capture: true,
	cwd,
	input: "n\n",
});
if (installResult.status !== 0) {
	process.stderr.write(installResult.stderr);
	process.stderr.write(installResult.stdout);
	process.exit(installResult.status ?? 1);
}
const afterInstall = snapshotFiles(cwd);
const installedFiles = changedFiles(before, afterInstall);
const sourceFiles = installedFiles.filter((relativePath) => NORMALIZED_EXTENSIONS.has(path.extname(relativePath)));
if (registryItems.length > 0 && sourceFiles.length === 0) {
	console.error(`Shadcn reported success but installed no source files for: ${registryItems.join(", ")}`);
	process.exit(1);
}
const sessionDirectory = getSessionDirectory(cwd);
replaceDirectory(sessionDirectory);
copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "raw"));

if (sourceFiles.length > 0) {
	run("pnpm", ["exec", "biome", "check", "--fix", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, capture: true, cwd });
}
copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "baseline"));

const patchDirectory = path.join(cstdNextRoot, "script", "shadcn", "patches");
const patchErrors = [];
const patchResults = [];
for (const registryItem of registryItems) {
	const result = applyLearnedPatch({ cwd, patchDirectory, registryItem, style });
	patchResults.push({ registryItem, status: result.status });
	if (result.status === "invalid" || result.status === "stale") {
		patchErrors.push(result.error);
	}
}

if (sourceFiles.length > 0) {
	for (const relativePath of sourceFiles) {
		const absolutePath = path.join(cwd, relativePath);
		const source = fs.readFileSync(absolutePath, "utf8");
		const normalized = normalizeShadcnSource(source, relativePath);
		if (normalized !== source) {
			fs.writeFileSync(absolutePath, normalized);
		}
	}
	run("pnpm", ["exec", "biome", "check", "--fix", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, capture: true, cwd });
}

copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "normalized"));
fs.writeFileSync(
	path.join(sessionDirectory, "session.json"),
	`${JSON.stringify({ cwd, installedFiles, patchResults, registryItems, sourceFiles, style }, null, "\t")}\n`,
);

const biomeResult =
	sourceFiles.length > 0
		? run("pnpm", ["exec", "biome", "check", "--error-on-warnings", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, cwd })
		: { status: 0 };
run("pnpm", ["--filter", "cstd-ts", "build"], { cwd });
run("pnpm", ["--filter", "cstd-next", "build"], { cwd });
const typecheckResult = run("pnpm", ["run", "check-types"], { allowFailure: true, cwd });
if (patchErrors.length > 0 || biomeResult.status !== 0 || typecheckResult.status !== 0) {
	for (const patchError of patchErrors) {
		console.error(patchError);
	}
	console.error(`The ${style} installation remains at the exact destination paths requested by Shadcn:`);
	for (const relativePath of sourceFiles) {
		console.error(`- ${path.join(cwd, relativePath)}`);
	}
	console.error("Fix only generic compatibility errors in those installed files. Do not change branding, content, demo data, layout, or styling.");
	console.error("Then run `pnpm shadcn:patch`; it will verify, commit, and push the style-specific patch to canonical cstd-next.");
	process.exit(1);
}

console.log(`Shadcnblocks compatibility ready for style ${style} (${sourceFiles.length} source file(s)). Customize now; do not run shadcn:patch.`);
