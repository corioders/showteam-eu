#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { CSTD_NEXT_CANONICAL_REPOSITORY, checkCanonicalShadcnNormalization } from "./canonical.js";
import { normalizeShadcnSource } from "./codemods.js";
import { applyLearnedPatch, registryItemsFromArguments } from "./patches.js";
import { changedFiles, copyFiles, getSessionDirectory, loadLocalEnvironment, NORMALIZED_EXTENSIONS, replaceDirectory, run, snapshotFiles } from "./session.js";

const cwd = process.cwd();
loadLocalEnvironment(cwd);
const shadcnArguments = process.argv.slice(2);
if (shadcnArguments.length === 0) {
	console.error("usage: pnpm shadcn:add <registry-item> [...shadcn-options]");
	process.exit(1);
}
const registryItems = registryItemsFromArguments(shadcnArguments);
const cstdNextRoot = path.resolve(import.meta.dirname, "..", "..");
const gitRoot = run("git", ["rev-parse", "--show-toplevel"], { capture: true, cwd }).stdout.trim();
const canonicalCheck = checkCanonicalShadcnNormalization({ cstdNextRoot, gitRoot });
if (canonicalCheck.error !== null) {
	console.error(canonicalCheck.error.message);
	process.exit(1);
}
if (!canonicalCheck.isCurrent) {
	const subtreePrefix = path.relative(gitRoot, cstdNextRoot);
	console.error("Canonical cstd-next contains newer Shadcnblocks normalization. Update the subtree before installing a block:");
	console.error(`git subtree pull --prefix ${subtreePrefix} ${CSTD_NEXT_CANONICAL_REPOSITORY} main --squash`);
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
const sessionDirectory = getSessionDirectory(cwd);
replaceDirectory(sessionDirectory);
copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "raw"));

if (sourceFiles.length > 0) {
	run("pnpm", ["exec", "biome", "check", "--fix", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, capture: true, cwd });
}
copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "baseline"));

const patchDirectory = path.join(cstdNextRoot, "script", "shadcn", "patches");
const patchErrors = [];
for (const registryItem of registryItems) {
	const result = applyLearnedPatch({ cwd, patchDirectory, registryItem });
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
fs.writeFileSync(path.join(sessionDirectory, "session.json"), `${JSON.stringify({ cwd, installedFiles, registryItems, sourceFiles }, null, "\t")}\n`);

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
	console.error("Fix only the installed block's generic compatibility errors, then run `pnpm shadcn:learn` before project customization.");
	process.exit(1);
}

console.log(`Shadcnblocks compatibility ready (${sourceFiles.length} source file(s)). Customize now; do not run shadcn:learn.`);
