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

function normalizationIsCurrent(cstdNextRoot, gitRoot) {
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
	return canonicalFiles.size === localFiles.size && [...canonicalFiles].every(([relativePath, hash]) => localFiles.get(relativePath) === hash);
}

function restoreStash(gitRoot, stashCreated) {
	if (!stashCreated) {
		return null;
	}
	const popResult = run("git", ["stash", "pop", "--quiet", "--index"], { allowFailure: true, capture: true, cwd: gitRoot });
	if (popResult.status !== 0) {
		return new Error("Canonical cstd-next was pulled, but the previous working tree could not be restored automatically. Resolve `git stash pop` before continuing.");
	}
	return null;
}

export function synchronizeCanonicalShadcnNormalization({ canonicalRepository = CSTD_NEXT_CANONICAL_REPOSITORY, cstdNextRoot, gitRoot }) {
	const fetchResult = run("git", ["fetch", "--quiet", "--no-tags", canonicalRepository, "main"], {
		allowFailure: true,
		capture: true,
		cwd: gitRoot,
	});
	if (fetchResult.status !== 0) {
		return { error: new Error(`Unable to check canonical cstd-next at ${canonicalRepository}.`), status: "error" };
	}
	const subtreePrefix = path.relative(gitRoot, cstdNextRoot);
	if (subtreePrefix === "" || subtreePrefix.startsWith("..")) {
		return { error: new Error("Automatic cstd-next synchronization requires cstd-next to be a subtree of the current repository."), status: "diverged" };
	}
	const subtreeStatus = run("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", subtreePrefix], { capture: true, cwd: gitRoot });
	if (subtreeStatus.stdout.trim() !== "") {
		return { error: new Error(`Local changes exist in ${subtreePrefix}; commit or revert them before installing the block.`), status: "diverged" };
	}
	const splitResult = run("git", ["subtree", "split", "--prefix", subtreePrefix, "HEAD"], { allowFailure: true, capture: true, cwd: gitRoot });
	const localSubtreeCommit = splitResult.stdout.trim().split("\n").at(-1);
	if (splitResult.status !== 0 || !localSubtreeCommit) {
		return { error: new Error("Unable to determine the current cstd-next subtree revision."), status: "error" };
	}
	const canonicalCommit = run("git", ["rev-parse", "FETCH_HEAD"], { capture: true, cwd: gitRoot }).stdout.trim();
	const localTree = run("git", ["rev-parse", `${localSubtreeCommit}^{tree}`], { capture: true, cwd: gitRoot }).stdout.trim();
	const canonicalTree = run("git", ["rev-parse", `${canonicalCommit}^{tree}`], { capture: true, cwd: gitRoot }).stdout.trim();
	if (localSubtreeCommit === canonicalCommit) {
		return { error: null, status: "current" };
	}
	const ancestryResult = run("git", ["merge-base", "--is-ancestor", localSubtreeCommit, "FETCH_HEAD"], { allowFailure: true, capture: true, cwd: gitRoot });
	if (localTree !== canonicalTree && ancestryResult.status !== 0) {
		return {
			error: new Error(`Local cstd-next and ${canonicalRepository} main diverged. An agent must reconcile the subtree before installing the block.`),
			status: "diverged",
		};
	}

	const workingTreeStatus = run("git", ["status", "--porcelain=v1", "--untracked-files=all"], { capture: true, cwd: gitRoot }).stdout;
	const stashCreated = workingTreeStatus.trim() !== "";
	if (stashCreated) {
		const stashResult = run("git", ["stash", "push", "--quiet", "--include-untracked", "--message", "cstd-shadcn-auto-pull"], {
			allowFailure: true,
			capture: true,
			cwd: gitRoot,
		});
		if (stashResult.status !== 0) {
			return { error: new Error("Unable to preserve the working tree before updating cstd-next."), status: "error" };
		}
	}

	const pullResult = run("git", ["subtree", "pull", "--prefix", subtreePrefix, canonicalRepository, "main", "--squash"], {
		allowFailure: true,
		capture: true,
		cwd: gitRoot,
	});
	if (pullResult.status !== 0) {
		const mergeHead = run("git", ["rev-parse", "--verify", "--quiet", "MERGE_HEAD"], { allowFailure: true, capture: true, cwd: gitRoot });
		if (mergeHead.status === 0) {
			run("git", ["merge", "--abort"], { allowFailure: true, capture: true, cwd: gitRoot });
		}
		const restoreError = restoreStash(gitRoot, stashCreated);
		return {
			error: restoreError ?? new Error("The canonical cstd-next update did not merge cleanly. An agent must reconcile the subtree before installing the block."),
			status: "diverged",
		};
	}

	const restoreError = restoreStash(gitRoot, stashCreated);
	if (restoreError) {
		return { error: restoreError, status: "error" };
	}
	return { error: null, status: "updated" };
}

export function checkCanonicalShadcnNormalization({ canonicalRepository = CSTD_NEXT_CANONICAL_REPOSITORY, cstdNextRoot, gitRoot }) {
	const fetchResult = run("git", ["fetch", "--quiet", "--no-tags", canonicalRepository, "main"], { allowFailure: true, capture: true, cwd: gitRoot });
	if (fetchResult.status !== 0) {
		return { error: new Error(`Unable to check canonical cstd-next at ${canonicalRepository}.`), isCurrent: false };
	}
	return { error: null, isCurrent: normalizationIsCurrent(cstdNextRoot, gitRoot) };
}
