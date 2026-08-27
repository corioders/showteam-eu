import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { applyLearnedPatch, registryItemsFromArguments, writeLearnedPatch } from "../script/shadcn/patches.js";
import { loadLocalEnvironment, run, snapshotFiles } from "../script/shadcn/session.js";

const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cstd-shadcn-session-"));

afterAll(() => {
	fs.rmSync(fixtureDirectory, { recursive: true });
});

describe("Shadcnblocks installation snapshots", () => {
	it("never reads environment or unrelated files", () => {
		fs.writeFileSync(path.join(fixtureDirectory, ".env"), "SECRET=value\n");
		fs.writeFileSync(path.join(fixtureDirectory, "certificate.pem"), "private\n");
		fs.writeFileSync(path.join(fixtureDirectory, "component.tsx"), "export const Component = () => null;\n");

		expect([...snapshotFiles(fixtureDirectory).keys()]).toEqual(["component.tsx"]);
	});

	it("loads the app environment without shell evaluation", () => {
		const variableName = "CSTD_SHADCN_SESSION_TEST_KEY";
		delete process.env[variableName];
		fs.writeFileSync(path.join(fixtureDirectory, ".env"), `${variableName}=loaded\n`);

		loadLocalEnvironment(fixtureDirectory);

		expect(process.env[variableName]).toBe("loaded");
		delete process.env[variableName];
	});

	it("can answer an interactive command without inheriting stdin", () => {
		const result = run(process.execPath, ["-e", 'process.stdin.once("data", (input) => process.stdout.write(input))'], {
			capture: true,
			input: "n\n",
		});

		expect(result.stdout).toBe("n\n");
	});

	it("learns, verifies, and reapplies a complete dashboard9 patch", () => {
		const baselineRoot = path.join(fixtureDirectory, "dashboard9-baseline");
		const fixedRoot = path.join(fixtureDirectory, "dashboard9-fixed");
		const installRoot = path.join(fixtureDirectory, "dashboard9-install");
		const patchDirectory = path.join(fixtureDirectory, "patches");
		const relativePath = "src/components/dashboard9.tsx";
		const upstream = 'export const status = "pending";\n';
		const fixed = 'export const status = "compatible";\n';
		for (const [root, source] of [
			[baselineRoot, upstream],
			[fixedRoot, fixed],
			[installRoot, upstream],
		] as const) {
			fs.mkdirSync(path.join(root, "src/components"), { recursive: true });
			fs.writeFileSync(path.join(root, relativePath), source);
		}

		const [learnedPatch, learningError] = writeLearnedPatch({
			baselineRoot,
			currentRoot: fixedRoot,
			patchDirectory,
			registryItem: "@shadcnblocks/dashboard9",
			sourceFiles: [relativePath],
		});

		expect(learningError).toBeNull();
		expect(learnedPatch?.changedFiles).toEqual([relativePath]);
		expect(fs.readFileSync(learnedPatch?.patchPath ?? "", "utf8")).not.toContain(fixtureDirectory);
		expect(applyLearnedPatch({ cwd: installRoot, patchDirectory, registryItem: "@shadcnblocks/dashboard9" })).toMatchObject({ status: "applied" });
		expect(fs.readFileSync(path.join(installRoot, relativePath), "utf8")).toBe(fixed);

		fs.writeFileSync(path.join(installRoot, relativePath), 'export const status = "upstream-v2";\n');
		expect(applyLearnedPatch({ cwd: installRoot, patchDirectory, registryItem: "@shadcnblocks/dashboard9" })).toMatchObject({ status: "stale" });
	});

	it("extracts only purchased registry items from shadcn arguments", () => {
		expect(registryItemsFromArguments(["@shadcnblocks/dashboard9", "-y", "button"])).toEqual(["@shadcnblocks/dashboard9"]);
	});
});
