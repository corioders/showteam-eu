#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { normalizeShadcnSource } from "./codemods.js";
import { changedFiles, copyFiles, getSessionDirectory, loadLocalEnvironment, NORMALIZED_EXTENSIONS, replaceDirectory, run, snapshotFiles } from "./session.js";

const cwd = process.cwd();
loadLocalEnvironment(cwd);
const shadcnArguments = process.argv.slice(2);
if (shadcnArguments.length === 0) {
	console.error("usage: pnpm shadcn:add <registry-item> [...shadcn-options]");
	process.exit(1);
}

const before = snapshotFiles(cwd);
run("pnpm", ["dlx", "shadcn@latest", "add", ...shadcnArguments], { cwd });
const afterInstall = snapshotFiles(cwd);
const installedFiles = changedFiles(before, afterInstall);
const sourceFiles = installedFiles.filter((relativePath) => NORMALIZED_EXTENSIONS.has(path.extname(relativePath)));
const sessionDirectory = getSessionDirectory(cwd);
replaceDirectory(sessionDirectory);
copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "raw"));

if (sourceFiles.length > 0) {
	run("pnpm", ["exec", "biome", "check", "--fix", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, cwd });
	for (const relativePath of sourceFiles) {
		const absolutePath = path.join(cwd, relativePath);
		const source = fs.readFileSync(absolutePath, "utf8");
		const normalized = normalizeShadcnSource(source, relativePath);
		if (normalized !== source) {
			fs.writeFileSync(absolutePath, normalized);
		}
	}
	run("pnpm", ["exec", "biome", "check", "--fix", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, cwd });
}

copyFiles(cwd, sourceFiles, path.join(sessionDirectory, "normalized"));
fs.writeFileSync(path.join(sessionDirectory, "session.json"), `${JSON.stringify({ cwd, installedFiles, sourceFiles }, null, "\t")}\n`);

const biomeResult =
	sourceFiles.length > 0
		? run("pnpm", ["exec", "biome", "check", "--error-on-warnings", "--no-errors-on-unmatched", ...sourceFiles], { allowFailure: true, cwd })
		: { status: 0 };
const typecheckResult = run("pnpm", ["run", "check-types"], { allowFailure: true, cwd });
if (biomeResult.status !== 0 || typecheckResult.status !== 0) {
	console.error("Shadcnblocks normalization needs a new rule. Fix the installed block, then run `pnpm shadcn:learn`.");
	process.exit(1);
}

console.log(`Normalized ${sourceFiles.length} Shadcnblocks source file(s).`);
