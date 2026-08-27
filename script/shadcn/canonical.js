import fs from "node:fs";
import path from "node:path";

import { run } from "./session.js";

export const CSTD_NEXT_CANONICAL_REPOSITORY = "git@github.com:corioders/cstd-next.git";
const NORMALIZATION_PATHS = ["script/shadcn/codemods.js", "script/shadcn/patches"];

function localNormalizationFiles(cstdNextRoot) {
	const files = ["script/shadcn/codemods.js"];
	const patchDirectory = path.join(cstdNextRoot, "script", "shadcn", "patches");
	if (fs.existsSync(patchDirectory)) {
		for (const entry of fs.readdirSync(patchDirectory, { recursive: true, withFileTypes: true })) {
			if (entry.isFile()) {
				files.push(path.relative(cstdNextRoot, path.join(entry.parentPath, entry.name)));
			}
		}
	}
	return files;
}

function localBlobHash(cstdNextRoot, relativePath) {
	const result = run("git", ["hash-object", "--no-filters", path.join(cstdNextRoot, relativePath)], { capture: true });
	return result.stdout.trim();
}

export function checkCanonicalShadcnNormalization({ canonicalRepository = CSTD_NEXT_CANONICAL_REPOSITORY, cstdNextRoot, gitRoot }) {
	const fetchResult = run("git", ["fetch", "--quiet", "--no-tags", "--depth=1", canonicalRepository, "main"], {
		allowFailure: true,
		capture: true,
		cwd: gitRoot,
	});
	if (fetchResult.status !== 0) {
		return { error: new Error(`Unable to check canonical cstd-next at ${canonicalRepository}.`), isCurrent: false };
	}

	const treeResult = run("git", ["ls-tree", "-r", "FETCH_HEAD", "--", ...NORMALIZATION_PATHS], { capture: true, cwd: gitRoot });
	const canonicalFiles = new Map(
		treeResult.stdout
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [metadata, relativePath] = line.split("\t");
				return [relativePath, metadata.split(" ")[2]];
			}),
	);
	const localFiles = new Map(localNormalizationFiles(cstdNextRoot).map((relativePath) => [relativePath, localBlobHash(cstdNextRoot, relativePath)]));

	return {
		error: null,
		isCurrent: canonicalFiles.size === localFiles.size && [...canonicalFiles].every(([relativePath, hash]) => localFiles.get(relativePath) === hash),
	};
}
