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
const repositoryRoot = run("git", ["rev-parse", "--show-toplevel"], { capture: true, cwd }).stdout.trim();
const cstdNextRoot = path.resolve(import.meta.dirname, "..", "..");
const cstdNextPrefix = path.relative(repositoryRoot, cstdNextRoot) || ".";
const pushCommand = cstdNextPrefix === "." ? "git push origin main" : `git subtree push --prefix ${cstdNextPrefix} git@github.com:corioders/cstd-next.git main`;
console.log(`Captured manual fixes for: ${changedFiles.join(", ")}`);
console.log(`Local diff: ${patchPath}`);
console.log("Shadcnblocks learning is NOT complete. This command records evidence; it does not write a codemod.");
console.log("Before project branding, content, or demo-data changes:");
console.log(`1. Generalize only reusable compatibility fixes in ${cstdNextPrefix}/script/shadcn/codemods.js.`);
console.log(`2. Add a synthetic regression test in ${cstdNextPrefix}/test/shadcn-codemods.test.ts; never copy paid source into cstd-next.`);
console.log(`3. Run: pnpm --dir ${cstdNextPrefix} test:unit`);
console.log(`4. Commit the cstd-next changes, then run: ${pushCommand}`);
console.log("5. Confirm canonical cstd-next is pushed. Only then customize the installed block for this project.");
