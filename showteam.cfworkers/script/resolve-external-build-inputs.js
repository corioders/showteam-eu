// biome-ignore-all lint/plugin/no-throw: This command-line trust boundary reports invalid provider configuration through process failure.
// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Providers inherit arbitrary secrets and GitHub supplies output-file paths outside Turborepo.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultWorkspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(process.argv[2] ?? defaultWorkspace);
const registryPath = path.join(workspace, "external-build-inputs.json");
const outputRoot = path.join(workspace, ".cstd", "build-inputs");
const dependencyNamePattern = /^[a-z0-9][a-z0-9-]*$/;

function digest(value) {
	return createHash("sha256").update(value).digest("hex");
}

async function readRegistry() {
	try {
		return JSON.parse(await fs.readFile(registryPath, "utf8"));
	} catch (error) {
		if (error?.code === "ENOENT") {
			return { version: 1, dependencies: [] };
		}
		throw error;
	}
}

function validateRegistry(registry) {
	if (registry.version !== 1 || !Array.isArray(registry.dependencies)) {
		throw new Error("external-build-inputs.json must contain version 1 and a dependencies array.");
	}
	const names = new Set();
	for (const dependency of registry.dependencies) {
		if (!dependencyNamePattern.test(dependency.name ?? "")) {
			throw new Error(`Invalid external build dependency name: ${dependency.name ?? "<missing>"}.`);
		}
		if (names.has(dependency.name)) {
			throw new Error(`Duplicate external build dependency: ${dependency.name}.`);
		}
		if (
			!Array.isArray(dependency.command) ||
			dependency.command.length === 0 ||
			dependency.command.some((argument) => typeof argument !== "string" || argument.length === 0)
		) {
			throw new Error(`Dependency ${dependency.name} must define a non-empty command array.`);
		}
		names.add(dependency.name);
	}
}

async function runProvider(dependency) {
	const finalDirectory = path.join(outputRoot, dependency.name);
	const temporaryDirectory = `${finalDirectory}.tmp-${process.pid}`;
	await fs.rm(temporaryDirectory, { recursive: true, force: true });
	await fs.mkdir(temporaryDirectory, { recursive: true });

	await new Promise((resolve, reject) => {
		const providerEnvironment = { ...process.env };
		providerEnvironment["CSTD_BUILD_INPUT_DIRECTORY"] = temporaryDirectory;
		const child = spawn(dependency.command[0], dependency.command.slice(1), {
			cwd: workspace,
			env: providerEnvironment,
			stdio: "inherit",
		});
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`External build dependency ${dependency.name} failed (${signal ?? `exit ${code}`}).`));
			}
		});
	});

	const files = await listFiles(temporaryDirectory);
	if (files.length === 0) {
		throw new Error(`External build dependency ${dependency.name} produced no snapshot files.`);
	}
	const fingerprint = createHash("sha256");
	for (const relativePath of files) {
		fingerprint.update(relativePath);
		fingerprint.update("\0");
		fingerprint.update(await fs.readFile(path.join(temporaryDirectory, relativePath)));
		fingerprint.update("\0");
	}

	await fs.rm(finalDirectory, { recursive: true, force: true });
	await fs.rename(temporaryDirectory, finalDirectory);
	return { name: dependency.name, fingerprint: fingerprint.digest("hex"), files };
}

async function listFiles(directory, prefix = "") {
	const result = [];
	const entries = await fs.readdir(path.join(directory, prefix), { withFileTypes: true });
	for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
		const relativePath = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) {
			result.push(...(await listFiles(directory, relativePath)));
		} else if (entry.isFile()) {
			result.push(relativePath);
		} else {
			throw new Error(`Snapshot may only contain regular files: ${relativePath}.`);
		}
	}
	return result;
}

async function appendEnvironment(name, value) {
	const githubEnvironmentPath = process.env["GITHUB_ENV"];
	const githubOutputPath = process.env["GITHUB_OUTPUT"];
	if (githubEnvironmentPath) {
		await fs.appendFile(githubEnvironmentPath, `${name}=${value}\n`);
	}
	if (githubOutputPath) {
		await fs.appendFile(githubOutputPath, `${name.toLowerCase()}=${value}\n`);
	}
}

const registry = await readRegistry();
validateRegistry(registry);
await fs.mkdir(outputRoot, { recursive: true });
const dependencies = (await Promise.all(registry.dependencies.map(runProvider))).sort((left, right) => left.name.localeCompare(right.name));
const activeNames = new Set(dependencies.map(({ name }) => name));
for (const entry of await fs.readdir(outputRoot, { withFileTypes: true })) {
	if (entry.isDirectory() && !activeNames.has(entry.name) && !entry.name.includes(`.tmp-${process.pid}`)) {
		await fs.rm(path.join(outputRoot, entry.name), { recursive: true, force: true });
	}
}
const manifest = { version: 1, dependencies };
const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
const buildInputsHash = digest(serializedManifest);
await fs.writeFile(path.join(outputRoot, "manifest.json"), serializedManifest);
await appendEnvironment("CSTD_EXTERNAL_BUILD_INPUTS_HASH", buildInputsHash);
process.stdout.write(`External build inputs: ${dependencies.length}; fingerprint: ${buildInputsHash}\n`);
