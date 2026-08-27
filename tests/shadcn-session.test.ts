import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { loadLocalEnvironment, snapshotFiles } from "../script/shadcn/session.js";

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
});
