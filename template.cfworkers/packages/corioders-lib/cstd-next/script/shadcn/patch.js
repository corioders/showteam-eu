#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CSTD_NEXT_CANONICAL_REPOSITORY } from "./canonical.js";
import { learnedPatchPaths, readShadcnStyle, writeLearnedPatch } from "./patches.js";
import { compatibilityTestPath, fileHash, getSessionDirectory, run } from "./session.js";

const cwd = process.cwd();
const sessionDirectory = getSessionDirectory(cwd);
const sessionPath = path.join(sessionDirectory, "session.json");
if (!fs.existsSync(sessionPath)) {
	console.error("No Shadcnblocks installation session found. Run `pnpm shadcn:add` first.");
	process.exit(1);
}

const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
if (session.registryItems?.length !== 1) {
	console.error("Patching requires exactly one @shadcnblocks registry item in the latest installation session.");
	process.exit(1);
}
const [currentStyle, styleError] = readShadcnStyle(cwd);
if (styleError) {
	console.error(styleError.message);
	process.exit(1);
}
if (session.style !== currentStyle) {
	console.error(`components.json style changed from ${session.style} to ${currentStyle}. Run shadcn:add again before creating a patch.`);
	process.exit(1);
}

const compatibilityTest = compatibilityTestPath(session.registryItems[0]);
const compatibilityTestAbsolutePath = path.join(cwd, compatibilityTest);
if (session.compatibilityTestHashes === undefined) {
	console.error("The latest Shadcnblocks installation session predates browser verification. Run shadcn:add again before patching.");
	process.exit(1);
}
const previousCompatibilityTestHash = session.compatibilityTestHashes?.[compatibilityTest] ?? null;
const currentCompatibilityTestHash = fileHash(compatibilityTestAbsolutePath);
if (currentCompatibilityTestHash === null || currentCompatibilityTestHash === previousCompatibilityTestHash) {
	console.error(
		`Add or update ${compatibilityTest} after shadcn:add. It must render the installed block, exercise every interactive state, and fail on browser console or page errors.`,
	);
	process.exit(1);
}

const existingSourceFiles = session.sourceFiles.filter((relativePath) => fs.existsSync(path.join(cwd, relativePath)));
const biomeResult = run("pnpm", ["exec", "biome", "check", "--error-on-warnings", "--no-errors-on-unmatched", ...existingSourceFiles, compatibilityTest], {
	allowFailure: true,
	cwd,
});
const typecheckResult = run("pnpm", ["run", "check-types"], { allowFailure: true, cwd });
if (biomeResult.status !== 0 || typecheckResult.status !== 0) {
	console.error("The installed block still fails compatibility checks. Fix every generic error without customization before creating its patch.");
	process.exit(1);
}

const buildResult = run("pnpm", ["run", "build"], { allowFailure: true, cwd });
if (buildResult.status !== 0) {
	console.error("The installed block failed the production build; the compatibility patch was not created.");
	process.exit(1);
}
const browserTestResult = run("pnpm", ["exec", "playwright", "test", compatibilityTest], { allowFailure: true, cwd });
if (browserTestResult.status !== 0) {
	console.error(`The installed block failed ${compatibilityTest}; the compatibility patch was not created.`);
	process.exit(1);
}

const repositoryRoot = run("git", ["rev-parse", "--show-toplevel"], { capture: true, cwd }).stdout.trim();
const cstdNextRoot = path.resolve(import.meta.dirname, "..", "..");
const cstdNextPrefix = path.relative(repositoryRoot, cstdNextRoot) || ".";
const patchDirectory = path.join(cstdNextRoot, "script", "shadcn", "patches");
const baselineRoot = path.join(sessionDirectory, "baseline");
const hasCompatibilityChanges = session.sourceFiles.some((relativePath) => {
	const baselinePath = path.join(baselineRoot, relativePath);
	const currentPath = path.join(cwd, relativePath);
	return !fs.existsSync(baselinePath) || !fs.existsSync(currentPath) || !fs.readFileSync(baselinePath).equals(fs.readFileSync(currentPath));
});
const replacesExistingPatch = session.patchResults?.some((result) => result.status === "invalid" || result.status === "stale" || result.status === "unverified") ?? false;
if (!hasCompatibilityChanges && !replacesExistingPatch) {
	console.error("No generic compatibility fixes exist for the latest Shadcnblocks installation.");
	process.exit(1);
}

let temporaryPatch = null;
let temporaryPatchDirectory = null;
if (hasCompatibilityChanges) {
	temporaryPatchDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cstd-shadcn-learned-"));
	const [learnedPatch, learningError] = writeLearnedPatch({
		baselineRoot,
		currentRoot: cwd,
		patchDirectory: temporaryPatchDirectory,
		registryItem: session.registryItems[0],
		sourceFiles: session.sourceFiles,
		style: session.style,
		verificationTest: { hash: currentCompatibilityTestHash, path: compatibilityTest },
	});
	if (learningError) {
		fs.rmSync(temporaryPatchDirectory, { force: true, recursive: true });
		console.error(learningError.message);
		process.exit(1);
	}
	temporaryPatch = learnedPatch;
}

const cstdTests = run("pnpm", ["--dir", cstdNextRoot, "test:unit"], { allowFailure: true, cwd: repositoryRoot });
if (cstdTests.status !== 0) {
	if (temporaryPatchDirectory) {
		fs.rmSync(temporaryPatchDirectory, { force: true, recursive: true });
	}
	console.error("cstd-next tests failed; the existing canonical patch was not changed.");
	process.exit(1);
}

fs.mkdirSync(patchDirectory, { recursive: true });
const { manifestPath, patchPath } = learnedPatchPaths(patchDirectory, session.registryItems[0], session.style);
if (temporaryPatch && temporaryPatchDirectory) {
	fs.copyFileSync(temporaryPatch.manifestPath, manifestPath);
	fs.copyFileSync(temporaryPatch.patchPath, patchPath);
	fs.rmSync(temporaryPatchDirectory, { force: true, recursive: true });
} else {
	fs.rmSync(manifestPath, { force: true });
	fs.rmSync(patchPath, { force: true });
}

const repositoryPatchPaths = [manifestPath, patchPath].map((filePath) => path.relative(repositoryRoot, filePath));
const canonicalPatchPaths = [manifestPath, patchPath].map((filePath) => path.relative(cstdNextRoot, filePath));
const registryName = session.registryItems[0].slice("@shadcnblocks/".length);
const commitMessage = `fix(cstd-next): patch ${registryName} for ${session.style}`;
run("git", ["add", "--all", "--", ...repositoryPatchPaths], { cwd: repositoryRoot });
const commitResult = run("git", ["commit", "--only", "-m", commitMessage, "--", ...repositoryPatchPaths], {
	allowFailure: true,
	cwd: repositoryRoot,
});
if (commitResult.status !== 0) {
	console.error("The style-specific patch is verified but could not be committed. Resolve the repository state, then rerun `pnpm shadcn:patch`.");
	process.exit(1);
}

let pushResult;
if (cstdNextPrefix === ".") {
	pushResult = run("git", ["push", CSTD_NEXT_CANONICAL_REPOSITORY, "HEAD:main"], { allowFailure: true, cwd: repositoryRoot });
} else {
	const fetchResult = run("git", ["fetch", "--quiet", "--no-tags", CSTD_NEXT_CANONICAL_REPOSITORY, "main"], { allowFailure: true, cwd: repositoryRoot });
	if (fetchResult.status !== 0) {
		console.error("The patch commit exists locally, but canonical cstd-next could not be fetched.");
		process.exit(1);
	}
	const canonicalWorktree = fs.mkdtempSync(path.join(os.tmpdir(), "cstd-shadcn-canonical-"));
	const addWorktreeResult = run("git", ["worktree", "add", "--detach", canonicalWorktree, "FETCH_HEAD"], { allowFailure: true, capture: true, cwd: repositoryRoot });
	if (addWorktreeResult.status !== 0) {
		fs.rmSync(canonicalWorktree, { force: true, recursive: true });
		console.error("The patch commit exists locally, but a canonical cstd-next worktree could not be created.");
		process.exit(1);
	}
	for (const canonicalPatchPath of canonicalPatchPaths) {
		const sourcePath = path.join(cstdNextRoot, canonicalPatchPath);
		const destinationPath = path.join(canonicalWorktree, canonicalPatchPath);
		if (fs.existsSync(sourcePath)) {
			fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
			fs.copyFileSync(sourcePath, destinationPath);
		} else {
			fs.rmSync(destinationPath, { force: true });
		}
	}
	run("git", ["add", "--all", "--", ...canonicalPatchPaths], { cwd: canonicalWorktree });
	const canonicalCommitResult = run("git", ["commit", "-m", commitMessage, "--", ...canonicalPatchPaths], { allowFailure: true, cwd: canonicalWorktree });
	pushResult =
		canonicalCommitResult.status === 0
			? run("git", ["push", CSTD_NEXT_CANONICAL_REPOSITORY, "HEAD:main"], { allowFailure: true, cwd: canonicalWorktree })
			: canonicalCommitResult;
	run("git", ["worktree", "remove", "--force", canonicalWorktree], { allowFailure: true, capture: true, cwd: repositoryRoot });
}
if (pushResult.status !== 0) {
	console.error("The patch commit exists locally, but canonical cstd-next rejected the push. Reconcile canonical main before any project customization.");
	process.exit(1);
}

if (temporaryPatch) {
	console.log(`Committed and pushed ${session.registryItems[0]} compatibility for style ${session.style}: ${temporaryPatch.changedFiles.join(", ")}`);
} else {
	console.log(`Removed and pushed the obsolete ${session.registryItems[0]} compatibility patch for style ${session.style}; upstream now passes without it.`);
}
console.log("Canonical cstd-next is current. Project-specific customization may begin.");
