/** biome-ignore-all lint/style/noCommonJs: I want this script to be versatile */

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const kill = require("@magda/tree-kill");

const SECONDS_MULTIPLAYER = 1000;

const KILL_N_TIMES = 5;

const KILL_WAIT_BETWEEN_TRIES = 5 * SECONDS_MULTIPLAYER;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const consolePrefix = "regenerate-nextjs-cache:";
const branchHelpNote =
	"Note that this script is assuming that it's running on cloudflare pages. We need this branch to trigger regeneration ONLY on this specific branch.";

const ENABLE_CACHE_REGENERATE_ENV = process.env["REGENERATE_ENABLE"] === "true";
let enableCacheRegenerate = ENABLE_CACHE_REGENERATE_ENV;

const CURRENT_BRANCH = process.env["CF_PAGES_BRANCH"];
if (enableCacheRegenerate && !CURRENT_BRANCH) {
	throw new Error(`${consolePrefix} The CF_PAGES_BRANCH is required when ENABLE_CACHE_REGENERATE is set to true\n${branchHelpNote}`);
}

const REGENERATE_BRANCH_NAME = process.env["REGENERATE_BRANCH_NAME"];
if (enableCacheRegenerate && !REGENERATE_BRANCH_NAME) {
	throw new Error(`${consolePrefix} The REGENERATE_BRANCH_NAME is required when ENABLE_CACHE_REGENERATE is set to true\n${branchHelpNote}`);
}

const BUILD_TRIGGER_URL = process.env["REGENERATE_BUILD_TRIGGER_URL"];
if (enableCacheRegenerate) {
	if (!BUILD_TRIGGER_URL) {
		throw new Error(`${consolePrefix} The REGENERATE_BUILD_TRIGGER_URL is required when ENABLE_CACHE_REGENERATE is set to true`);
	}

	try {
		new URL(BUILD_TRIGGER_URL);
	} catch (error) {
		throw new Error(`${consolePrefix} REGENERATE_BUILD_TRIGGER_URL is not a valid URL ${error.message}`);
	}
}

const BUILD_TIMEOUT = Number(process.env["REGENERATE_BUILD_TIMEOUT"]);
if (enableCacheRegenerate && (Number.isNaN(BUILD_TIMEOUT) || BUILD_TIMEOUT <= 0)) {
	throw new Error(`${consolePrefix} REGENERATE_BUILD_TIMEOUT must be a positive number (seconds) when ENABLE_CACHE_REGENERATE is set to true`);
}

const OUTPUT_FOLDER_TO_CREATE = process.env["REGENERATE_OUTPUT_FOLDER_TO_CREATE"] ?? ".vercel/output/static";

if (ENABLE_CACHE_REGENERATE_ENV && CURRENT_BRANCH !== REGENERATE_BRANCH_NAME) {
	enableCacheRegenerate = false;
	console.log(`${consolePrefix} DISABLING CACHE REGENERATE BECAUSE ${CURRENT_BRANCH} !== ${REGENERATE_BRANCH_NAME}`);
}

console.log(
	`${consolePrefix} regenerate config:\n ENABLE_CACHE_REGENERATE_ENV: ${ENABLE_CACHE_REGENERATE_ENV}\n CURRENT_BRANCH: ${CURRENT_BRANCH}\n REGENERATE_BRANCH_NAME: ${REGENERATE_BRANCH_NAME}\n BUILD_TRIGGER_URL: ${BUILD_TRIGGER_URL}\n BUILD_TIMEOUT: ${BUILD_TIMEOUT}\n OUTPUT_FOLDER_TO_CREATE: ${OUTPUT_FOLDER_TO_CREATE}`,
);

async function scheduleNextBuild() {
	try {
		const response = await fetch(BUILD_TRIGGER_URL, { method: "POST" });
		if (!response.ok) {
			throw new Error(`Build trigger failed with status ${response.status}`);
		}
	} catch (error) {
		// Surface the error but still exit the wrapper predictably below
		console.log(`${consolePrefix} Failed to schedule next build:`, error);
	}
}

const nextjsBuildArguments = process.argv.slice(2);
const nextjsProcess = spawn("/bin/bash", ["-c", nextjsBuildArguments.join(" ")], {
	stdio: "inherit",
});

let nextjsProcessKilled = false;
if (enableCacheRegenerate && BUILD_TIMEOUT !== undefined) {
	const WAIT_TIME = BUILD_TIMEOUT * SECONDS_MULTIPLAYER;
	console.log(`${consolePrefix} WAITING FOR ${WAIT_TIME}`);
	setTimeout(async () => {
		console.log(`${consolePrefix} TIMEOUT FIRED. KILLING`);

		fs.mkdirSync(path.join(process.cwd(), OUTPUT_FOLDER_TO_CREATE), { recursive: true });

		await scheduleNextBuild();

		nextjsProcessKilled = true;
		for (let i = 0; i < KILL_N_TIMES; i++) {
			console.log(`${consolePrefix} KILLING THE NEXTJS PROCESS`);

			await new Promise((resolve) => {
				try {
					kill(nextjsProcess.pid, "SIGKILL", (error) => {
						if (error) {
							console.error(`${consolePrefix} KILL ERROR`, error);
						}
						resolve();
					});
				} catch (error) {
					console.log(`${consolePrefix} ERROR WHILE KILLING ${error}`);
				}
			});

			await sleep(KILL_WAIT_BETWEEN_TRIES);
		}

		console.log(`${consolePrefix} EXITING`);
		process.exit(0);
	}, WAIT_TIME);
}

nextjsProcess.on("exit", async (code, signal) => {
	// We don't want to trigger regenerate on nextjs build error.
	// We will run out of builds, because it's very likely the error is has to be fixed. In other words, it cant be resolved retrying.

	if (nextjsProcessKilled) {
		// We want to pretend everything went fine.
		console.log(`${consolePrefix} NEXTJS PROCESS KILLED EXITING`);
		process.exit(0);
	}

	if (signal) {
		console.log(`${consolePrefix} EXITING SIGNAL: ${signal}`);
		process.kill(process.pid, signal);
		return;
	}

	console.log(`${consolePrefix} EXITING CODE: ${code}`);
	process.exit(code ?? 0);
});
