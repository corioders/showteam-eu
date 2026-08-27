#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { writeLearnedPatch } from "./patches.js";
import { getSessionDirectory, run } from "./session.js";

const cwd = process.cwd();
const sessionDirectory = getSessionDirectory(cwd);
const manifestPath = path.join(sessionDirectory, "session.json");
if (!fs.existsSync(manifestPath)) {
	console.error("No Shadcnblocks installation session found. Run `pnpm shadcn:add` first.");
	process.exit(1);
}

const session = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (session.registryItems?.length !== 1) {
	console.error("Learning requires exactly one @shadcnblocks registry item in the latest installation session.");
	process.exit(1);
}

const existingSourceFiles = session.sourceFiles.filter((relativePath) => fs.existsSync(path.join(cwd, relativePath)));
const biomeResult = run("pnpm", ["exec", "biome", "check", "--error-on-warnings", "--no-errors-on-unmatched", ...existingSourceFiles], {
	allowFailure: true,
	cwd,
});
const typecheckResult = run("pnpm", ["run", "check-types"], { allowFailure: true, cwd });
if (biomeResult.status !== 0 || typecheckResult.status !== 0) {
	console.error("The block still fails compatibility checks. Fix every generic error before learning its patch.");
	process.exit(1);
}

const repositoryRoot = run("git", ["rev-parse", "--show-toplevel"], { capture: true, cwd }).stdout.trim();
const cstdNextRoot = path.resolve(import.meta.dirname, "..", "..");
const cstdNextPrefix = path.relative(repositoryRoot, cstdNextRoot) || ".";
const patchDirectory = path.join(cstdNextRoot, "script", "shadcn", "patches");
const [learnedPatch, learningError] = writeLearnedPatch({
	baselineRoot: path.join(sessionDirectory, "baseline"),
	currentRoot: cwd,
	patchDirectory,
	registryItem: session.registryItems[0],
	sourceFiles: session.sourceFiles,
});
if (learningError) {
	console.error(learningError.message);
	process.exit(1);
}
const pushCommand = cstdNextPrefix === "." ? "git push origin main" : `git subtree push --prefix ${cstdNextPrefix} git@github.com:corioders/cstd-next.git main`;
console.log(`Learned and self-verified ${session.registryItems[0]} compatibility fixes for: ${learnedPatch.changedFiles.join(", ")}`);
console.log(`Patch: ${learnedPatch.patchPath}`);
console.log(`Manifest: ${learnedPatch.manifestPath}`);
console.log("Before project branding, content, or demo-data changes:");
console.log(`1. Run: pnpm --dir ${cstdNextPrefix} test:unit`);
console.log(`2. Commit the learned patch, then run: ${pushCommand}`);
console.log("3. Confirm canonical cstd-next is pushed. Only then customize the installed block for this project.");
