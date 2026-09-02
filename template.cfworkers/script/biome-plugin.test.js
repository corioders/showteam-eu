import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const biomeBinary = path.join(projectDirectory, "node_modules", ".bin", "biome");
const fixtureDirectory = path.join(projectDirectory, "script", "fixtures", "biome");
const nativeImageDiagnostic = /Native `<img>` is disallowed/;
const projectImageGuidance = /StaticImage.*OptimizedImage/;

function lintFixture(filename) {
	const fixturePath = path.join(fixtureDirectory, filename);
	const temporaryDirectory = mkdtempSync(path.join(projectDirectory, "apps", "web", "src", ".biome-plugin-test-"));
	const temporarySourcePath = path.join(temporaryDirectory, "fixture.tsx");
	writeFileSync(temporarySourcePath, readFileSync(fixturePath));
	try {
		return spawnSync(biomeBinary, ["lint", temporarySourcePath], {
			cwd: projectDirectory,
			encoding: "utf8",
		});
	} finally {
		rmSync(temporaryDirectory, { force: true, recursive: true });
	}
}

test("rejects native img elements with project image guidance", () => {
	const result = lintFixture("no-native-img.invalid.fixture");
	const output = `${result.stdout}${result.stderr}`;

	assert.notEqual(result.status, 0, output);
	assert.match(output, nativeImageDiagnostic);
	assert.match(output, projectImageGuidance);
});

test("accepts project image components", () => {
	const result = lintFixture("no-native-img.valid.fixture");

	assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
