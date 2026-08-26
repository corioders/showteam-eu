#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { getSessionDirectory, run } from "./session.js";

const cwd = process.cwd();
const sessionDirectory = getSessionDirectory(cwd);
const manifestPath = path.join(sessionDirectory, "session.json");
if (!fs.existsSync(manifestPath)) {
	console.error("No Shadcnblocks installation session found. Run `pnpm shadcn:add` first.");
	process.exit(1);
}

const session = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const patches = [];
const changedFiles = [];
for (const relativePath of session.sourceFiles) {
	const normalizedPath = path.join(sessionDirectory, "normalized", relativePath);
	const currentPath = path.join(cwd, relativePath);
	if (!fs.existsSync(normalizedPath) || !fs.existsSync(currentPath)) {
		continue;
	}
	const normalized = fs.readFileSync(normalizedPath);
	const current = fs.readFileSync(currentPath);
	if (normalized.equals(current)) {
		continue;
	}
	changedFiles.push(relativePath);
	const result = run("git", ["diff", "--no-index", "--no-prefix", "--", normalizedPath, currentPath], {
		allowFailure: true,
		capture: true,
		cwd,
	});
	patches.push(result.stdout);
}

if (changedFiles.length === 0) {
	console.error("No manual fixes found after the latest normalized Shadcnblocks install.");
	process.exit(1);
}

const patchPath = path.join(sessionDirectory, "learning.patch");
fs.writeFileSync(patchPath, patches.join("\n"));
console.log(`Captured manual fixes for: ${changedFiles.join(", ")}`);
console.log(`Local diff: ${patchPath}`);
console.log(
	"Generalize the smallest safe transformation in cstd-next/script/shadcn/codemods.js and add a synthetic regression test. Never copy Shadcnblocks source into cstd-next.",
);
