import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const resolver = path.join(path.dirname(fileURLToPath(import.meta.url)), "resolve-external-build-inputs.js");
const fingerprintPattern = /fingerprint: ([a-f0-9]{64})/;

test("hashes exact provider snapshots deterministically", async () => {
	const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "cstd-build-inputs-"));
	try {
		const provider = path.join(workspace, "provider.js");
		await fs.writeFile(
			provider,
			'import fs from "node:fs/promises"; import path from "node:path"; await fs.writeFile(path.join(process.env.CSTD_BUILD_INPUT_DIRECTORY, "cms.json"), process.env.CMS_VALUE);\n',
		);
		await fs.writeFile(
			path.join(workspace, "external-build-inputs.json"),
			JSON.stringify({ version: 1, dependencies: [{ name: "cms", command: [process.execPath, provider] }] }),
		);

		const first = run(workspace, "one");
		const second = run(workspace, "one");
		const changed = run(workspace, "two");
		assert.equal(first, second);
		assert.notEqual(first, changed);
		assert.equal(await fs.readFile(path.join(workspace, ".cstd/build-inputs/cms/cms.json"), "utf8"), "two");

		await fs.writeFile(path.join(workspace, "external-build-inputs.json"), JSON.stringify({ version: 1, dependencies: [] }));
		run(workspace, "ignored");
		await assert.rejects(fs.access(path.join(workspace, ".cstd/build-inputs/cms")));
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

function run(workspace, value) {
	const env = { ...process.env };
	env["CMS_VALUE"] = value;
	const result = spawnSync(process.execPath, [resolver, workspace], { encoding: "utf8", env });
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.match(fingerprintPattern)?.[1];
}
