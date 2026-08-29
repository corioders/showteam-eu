import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";

const configuredShardCount = process.env.CSTD_E2E_SHARDS;
const shardCount = process.env.CI ? Number(configuredShardCount || Math.min(4, availableParallelism())) : 1;
const runsAgainstExternalUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL);

if (!Number.isInteger(shardCount) || shardCount < 1) {
	process.stderr.write(`CSTD_E2E_SHARDS must be a positive integer, received ${configuredShardCount}.\n`);
	process.exit(2);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const runningProcesses = new Set();

function runPlaywright(arguments_, environment) {
	return new Promise((resolve, reject) => {
		const child = spawn(pnpmCommand, ["exec", "playwright", "test", ...arguments_], {
			env: { ...process.env, ...environment },
			stdio: "inherit",
		});
		runningProcesses.add(child);
		child.once("error", reject);
		child.once("exit", (code) => {
			runningProcesses.delete(child);
			resolve(code ?? 1);
		});
	});
}

function terminateChildren(signal) {
	for (const child of runningProcesses) {
		child.kill(signal);
	}
}

process.once("SIGINT", () => terminateChildren("SIGINT"));
process.once("SIGTERM", () => terminateChildren("SIGTERM"));

if (shardCount === 1) {
	process.exitCode = await runPlaywright([], {});
} else {
	const sourceStateDirectory = path.resolve(".wrangler/state/v3");
	const shardStateRoot = path.resolve(".wrangler/e2e-shards");
	const basePort = 3100;

	if (!runsAgainstExternalUrl) {
		await rm(shardStateRoot, { force: true, recursive: true });
		await mkdir(shardStateRoot, { recursive: true });
	}

	try {
		const shardRuns = [];
		for (let shardIndex = 1; shardIndex <= shardCount; shardIndex += 1) {
			const environment = {};
			if (!runsAgainstExternalUrl) {
				const shardStateDirectory = path.join(shardStateRoot, String(shardIndex));
				await cp(sourceStateDirectory, shardStateDirectory, { recursive: true });
				environment.CSTD_D1_PERSIST_PATH = shardStateDirectory;
				environment.CSTD_E2E_PORT = String(basePort + shardIndex - 1);
			}
			shardRuns.push(runPlaywright(["--workers=1", `--shard=${shardIndex}/${shardCount}`, `--output=test-results/shard-${shardIndex}`], environment));
		}

		const exitCodes = await Promise.all(shardRuns);
		process.exitCode = exitCodes.find((exitCode) => exitCode !== 0) ?? 0;
	} finally {
		if (!runsAgainstExternalUrl) {
			await rm(shardStateRoot, { force: true, recursive: true });
		}
	}
}
