import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { checkCanonicalShadcnNormalization, synchronizeCanonicalShadcnNormalization } from "../script/shadcn/canonical.js";
import { applyLearnedPatch, readShadcnStyle, registryItemsFromArguments, writeLearnedPatch } from "../script/shadcn/patches.js";
import { compatibilityTestPath, fileHash, loadLocalEnvironment, run, snapshotFiles } from "../script/shadcn/session.js";

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

	it("uses one deterministic browser test per registry block and detects changes", () => {
		const testPath = compatibilityTestPath("@shadcnblocks/dashboard3");
		const absoluteTestPath = path.join(fixtureDirectory, testPath);
		expect(testPath).toBe("tests/e2e/shadcn/dashboard3.spec.ts");
		expect(fileHash(absoluteTestPath)).toBeNull();
		fs.mkdirSync(path.dirname(absoluteTestPath), { recursive: true });
		fs.writeFileSync(absoluteTestPath, "test v1\n");
		const firstHash = fileHash(absoluteTestPath);
		fs.writeFileSync(absoluteTestPath, "test v2\n");
		expect(fileHash(absoluteTestPath)).not.toBe(firstHash);
	});

	it("learns, verifies, and reapplies a complete dashboard9 patch", () => {
		const baselineRoot = path.join(fixtureDirectory, "dashboard9-baseline");
		const fixedRoot = path.join(fixtureDirectory, "dashboard9-fixed");
		const installRepository = path.join(fixtureDirectory, "dashboard9-install-repository");
		const installRoot = path.join(installRepository, "apps", "web");
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
		run("git", ["init", "--initial-branch=main"], { capture: true, cwd: installRepository });

		const [learnedPatch, learningError] = writeLearnedPatch({
			baselineRoot,
			currentRoot: fixedRoot,
			patchDirectory,
			registryItem: "@shadcnblocks/dashboard9",
			sourceFiles: [relativePath],
			style: "base-mira",
			verificationTest: { hash: "browser-test-hash", path: "tests/e2e/shadcn/dashboard9.spec.ts" },
		});

		expect(learningError).toBeNull();
		expect(learnedPatch?.changedFiles).toEqual([relativePath]);
		expect(fs.readFileSync(learnedPatch?.patchPath ?? "", "utf8")).not.toContain(fixtureDirectory);
		expect(path.basename(learnedPatch?.patchPath ?? "")).toBe("base-mira__shadcnblocks__dashboard9.patch");
		expect(JSON.parse(fs.readFileSync(learnedPatch?.manifestPath ?? "", "utf8")).verificationTest).toEqual({
			hash: "browser-test-hash",
			path: "tests/e2e/shadcn/dashboard9.spec.ts",
		});
		const applicationResult = applyLearnedPatch({ cwd: installRoot, patchDirectory, registryItem: "@shadcnblocks/dashboard9", style: "base-mira" });
		expect(applicationResult).toEqual({ changedFiles: [relativePath], status: "applied" });
		expect(fs.readFileSync(path.join(installRoot, relativePath), "utf8")).toBe(fixed);

		fs.writeFileSync(path.join(installRoot, relativePath), 'export const status = "upstream-v2";\n');
		expect(applyLearnedPatch({ cwd: installRoot, patchDirectory, registryItem: "@shadcnblocks/dashboard9", style: "base-mira" })).toMatchObject({
			status: "stale",
		});
		expect(applyLearnedPatch({ cwd: installRoot, patchDirectory, registryItem: "@shadcnblocks/dashboard9", style: "new-york" })).toEqual({ status: "missing" });

		fs.writeFileSync(path.join(installRoot, relativePath), upstream);
		const legacyManifest = JSON.parse(fs.readFileSync(learnedPatch?.manifestPath ?? "", "utf8"));
		legacyManifest.formatVersion = 2;
		delete legacyManifest.verificationTest;
		fs.writeFileSync(learnedPatch?.manifestPath ?? "", `${JSON.stringify(legacyManifest)}\n`);
		expect(applyLearnedPatch({ cwd: installRoot, patchDirectory, registryItem: "@shadcnblocks/dashboard9", style: "base-mira" })).toMatchObject({
			status: "unverified",
		});
		expect(fs.readFileSync(path.join(installRoot, relativePath), "utf8")).toBe(fixed);
	});

	it("refuses to learn a compatibility patch without browser-test evidence", () => {
		const [learnedPatch, learningError] = writeLearnedPatch({
			baselineRoot: fixtureDirectory,
			currentRoot: fixtureDirectory,
			patchDirectory: fixtureDirectory,
			registryItem: "@shadcnblocks/dashboard3",
			sourceFiles: [],
			style: "base-mira",
			// @ts-expect-error Runtime validation protects JavaScript callers and stale sessions.
			verificationTest: undefined,
		});

		expect(learnedPatch).toBeNull();
		expect(learningError?.message).toContain("browser compatibility test is required");
	});

	it("reads and validates the components.json style", () => {
		const appRoot = path.join(fixtureDirectory, "styled-app");
		fs.mkdirSync(appRoot, { recursive: true });
		fs.writeFileSync(path.join(appRoot, "components.json"), '{"style":"base-mira"}\n');

		expect(readShadcnStyle(appRoot)).toEqual(["base-mira", null]);
	});

	it("extracts only purchased registry items from shadcn arguments", () => {
		expect(registryItemsFromArguments(["@shadcnblocks/dashboard9", "-y", "button"])).toEqual(["@shadcnblocks/dashboard9"]);
	});

	it("detects newer normalization in canonical cstd-next", () => {
		const canonicalRoot = path.join(fixtureDirectory, "canonical-cstd-next");
		const projectRoot = path.join(fixtureDirectory, "canonical-check-project");
		const vendoredRoot = path.join(projectRoot, "packages", "cstd-next");
		for (const root of [canonicalRoot, projectRoot]) {
			fs.mkdirSync(root, { recursive: true });
			run("git", ["init", "--initial-branch=main"], { capture: true, cwd: root });
			run("git", ["config", "user.email", "test@corioders.com"], { capture: true, cwd: root });
			run("git", ["config", "user.name", "Corioders Test"], { capture: true, cwd: root });
		}
		fs.mkdirSync(path.join(canonicalRoot, "script", "shadcn", "patches"), { recursive: true });
		fs.writeFileSync(path.join(canonicalRoot, "script", "shadcn", "codemods.js"), "export const version = 1;\n");
		fs.writeFileSync(path.join(canonicalRoot, "script", "shadcn", "patches", "dashboard.json"), "{}\n");
		run("git", ["add", "."], { cwd: canonicalRoot });
		run("git", ["commit", "-m", "initial normalization"], { capture: true, cwd: canonicalRoot });
		fs.cpSync(path.join(canonicalRoot, "script"), path.join(vendoredRoot, "script"), { recursive: true });

		expect(checkCanonicalShadcnNormalization({ canonicalRepository: canonicalRoot, cstdNextRoot: vendoredRoot, gitRoot: projectRoot })).toEqual({
			error: null,
			isCurrent: true,
		});

		fs.writeFileSync(path.join(canonicalRoot, "script", "shadcn", "codemods.js"), "export const version = 2;\n");
		run("git", ["add", "."], { cwd: canonicalRoot });
		run("git", ["commit", "-m", "update normalization"], { capture: true, cwd: canonicalRoot });
		expect(checkCanonicalShadcnNormalization({ canonicalRepository: canonicalRoot, cstdNextRoot: vendoredRoot, gitRoot: projectRoot })).toEqual({
			error: null,
			isCurrent: false,
		});
	});

	it("pulls a linear canonical subtree update and restores unrelated work", () => {
		const canonicalRoot = path.join(fixtureDirectory, "canonical-auto-update");
		const projectRoot = path.join(fixtureDirectory, "canonical-auto-update-project");
		for (const root of [canonicalRoot, projectRoot]) {
			fs.mkdirSync(root, { recursive: true });
			run("git", ["init", "--initial-branch=main"], { capture: true, cwd: root });
			run("git", ["config", "user.email", "test@corioders.com"], { capture: true, cwd: root });
			run("git", ["config", "user.name", "Corioders Test"], { capture: true, cwd: root });
		}
		fs.mkdirSync(path.join(canonicalRoot, "script", "shadcn", "patches"), { recursive: true });
		fs.writeFileSync(path.join(canonicalRoot, "script", "shadcn", "codemods.js"), "export const version = 1;\n");
		run("git", ["add", "."], { cwd: canonicalRoot });
		run("git", ["commit", "-m", "initial canonical"], { capture: true, cwd: canonicalRoot });
		fs.writeFileSync(path.join(projectRoot, "README.md"), "initial\n");
		run("git", ["add", "."], { cwd: projectRoot });
		run("git", ["commit", "-m", "initial project"], { capture: true, cwd: projectRoot });
		run("git", ["subtree", "add", "--prefix", "packages/cstd-next", canonicalRoot, "main", "--squash"], { capture: true, cwd: projectRoot });

		fs.writeFileSync(path.join(canonicalRoot, "script", "shadcn", "patches", "new.patch"), "patch\n");
		run("git", ["add", "."], { cwd: canonicalRoot });
		run("git", ["commit", "-m", "new canonical patch"], { capture: true, cwd: canonicalRoot });
		fs.writeFileSync(path.join(projectRoot, "README.md"), "unfinished user work\n");
		fs.writeFileSync(path.join(projectRoot, "TODO.md"), "staged task\n");
		run("git", ["add", "TODO.md"], { cwd: projectRoot });

		expect(
			synchronizeCanonicalShadcnNormalization({
				canonicalRepository: canonicalRoot,
				cstdNextRoot: path.join(projectRoot, "packages", "cstd-next"),
				gitRoot: projectRoot,
			}),
		).toEqual({ error: null, status: "updated" });
		expect(fs.readFileSync(path.join(projectRoot, "README.md"), "utf8")).toBe("unfinished user work\n");
		expect(run("git", ["diff", "--cached", "--name-only"], { capture: true, cwd: projectRoot }).stdout.trim()).toBe("TODO.md");
		expect(fs.readFileSync(path.join(projectRoot, "packages", "cstd-next", "script", "shadcn", "patches", "new.patch"), "utf8")).toBe("patch\n");
		expect(
			synchronizeCanonicalShadcnNormalization({
				canonicalRepository: canonicalRoot,
				cstdNextRoot: path.join(projectRoot, "packages", "cstd-next"),
				gitRoot: projectRoot,
			}),
		).toEqual({ error: null, status: "current" });

		const localOnlyPath = path.join(projectRoot, "packages", "cstd-next", "local-only.txt");
		fs.writeFileSync(localOnlyPath, "local\n");
		run("git", ["add", localOnlyPath], { cwd: projectRoot });
		run("git", ["commit", "--only", "-m", "local subtree change", "--", localOnlyPath], { capture: true, cwd: projectRoot });
		const divergence = synchronizeCanonicalShadcnNormalization({
			canonicalRepository: canonicalRoot,
			cstdNextRoot: path.join(projectRoot, "packages", "cstd-next"),
			gitRoot: projectRoot,
		});
		expect(divergence.status).toBe("diverged");
		expect(divergence.error?.message).toContain("An agent must reconcile");
	});
});
