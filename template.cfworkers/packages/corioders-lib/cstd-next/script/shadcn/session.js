import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const IGNORED_DIRECTORIES = new Set([".git", ".next", ".open-next", ".turbo", ".wrangler", "build", "coverage", "node_modules"]);
export const NORMALIZED_EXTENSIONS = new Set([".css", ".js", ".json", ".jsonc", ".jsx", ".ts", ".tsx"]);

export function loadLocalEnvironment(cwd) {
	const environmentPath = path.join(cwd, ".env");
	if (fs.existsSync(environmentPath)) {
		process.loadEnvFile(environmentPath);
	}
}

export function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: "utf8",
		stdio: options.capture ? "pipe" : "inherit",
	});
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	if (!options.allowFailure && result.status !== 0) {
		process.exit(result.status ?? 1);
	}
	return result;
}

function walk(directory, root, files) {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
			continue;
		}
		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			walk(absolutePath, root, files);
		} else if (entry.isFile() && NORMALIZED_EXTENSIONS.has(path.extname(entry.name))) {
			files.push(path.relative(root, absolutePath));
		}
	}
}

export function snapshotFiles(root) {
	const paths = [];
	walk(root, root, paths);
	return new Map(
		paths.map((relativePath) => {
			const content = fs.readFileSync(path.join(root, relativePath));
			return [relativePath, crypto.createHash("sha256").update(content).digest("hex")];
		}),
	);
}

export function changedFiles(before, after) {
	return [...after].filter(([relativePath, hash]) => before.get(relativePath) !== hash).map(([relativePath]) => relativePath);
}

export function getSessionDirectory(cwd) {
	const result = run("git", ["rev-parse", "--path-format=absolute", "--git-dir"], { capture: true, cwd });
	return path.join(result.stdout.trim(), "cstd-shadcn", "latest");
}

export function replaceDirectory(directory) {
	fs.rmSync(directory, { force: true, recursive: true });
	fs.mkdirSync(directory, { recursive: true });
}

export function copyFiles(root, relativePaths, destination) {
	for (const relativePath of relativePaths) {
		const target = path.join(destination, relativePath);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.copyFileSync(path.join(root, relativePath), target);
	}
}
