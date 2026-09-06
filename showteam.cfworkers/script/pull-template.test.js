import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const pullTemplate = path.resolve(import.meta.dirname, "..", "..", "pull_template.sh");
const consumerWorkflowNamePattern = /Deploys showteam\.cfworkers/;
const payloadBranchPattern = /- payload/;
const remoteBindingsPattern = /remoteBindings: true/;
const cloudflareTokenGuardPattern = /process\.env\["CLOUDFLARE_API_TOKEN"\]/;
const consumerPayloadCliPattern = /seed-ci\.ts/;

function git(cwd, ...args) {
	const result = spawnSync("git", args, { cwd, encoding: "utf8" });
	assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
}

function write(filePath, contents) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, contents);
}

test("pulls template updates across consumer renames without manual conflicts", () => {
	const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cstd-pull-template-"));
	const templateRoot = path.join(fixtureRoot, "template");
	const consumerRoot = path.join(fixtureRoot, "consumer");
	try {
		fs.mkdirSync(templateRoot);
		git(templateRoot, "init", "--initial-branch=main");
		git(templateRoot, "config", "user.email", "test@corioders.com");
		git(templateRoot, "config", "user.name", "Corioders Test");
		write(path.join(templateRoot, ".github/workflows/deploy.yml"), "# Deploys template.cfworkers\non:\n  push:\n    branches:\n      - deploy\n");
		write(path.join(templateRoot, "TODO.md"), "template task\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/next.config.ts"), "const options = { persist: true };\nexport default options;\n");
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-payload-admin.ts"));\nconst cloudflare: CloudflareContext =\n\tisCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });\n',
		);
		git(templateRoot, "add", ".");
		git(templateRoot, "commit", "-m", "initial template");

		git(fixtureRoot, "clone", templateRoot, consumerRoot);
		git(consumerRoot, "config", "user.email", "test@corioders.com");
		git(consumerRoot, "config", "user.name", "Corioders Test");
		git(consumerRoot, "remote", "rename", "origin", "template");
		fs.renameSync(path.join(consumerRoot, "template.cfworkers"), path.join(consumerRoot, "showteam.cfworkers"));
		write(path.join(consumerRoot, ".github/workflows/deploy.yml"), "# Deploys showteam.cfworkers\non:\n  push:\n    branches:\n      - deploy\n");
		write(
			path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-ci.ts"));\nconst cloudflare: CloudflareContext =\n\tisCLI || !isProduction || process.env.CSTD_D1_PERSIST_PATH ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });\n',
		);
		fs.rmSync(path.join(consumerRoot, "TODO.md"));
		git(consumerRoot, "add", "-A");
		git(consumerRoot, "commit", "-m", "initialize consumer");

		write(
			path.join(templateRoot, ".github/workflows/deploy.yml"),
			"# Deploys template.cfworkers\non:\n  push:\n    branches:\n      - main\n      - payload\n      - deploy\n",
		);
		write(path.join(templateRoot, "TODO.md"), "updated template task\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/next.config.ts"), "const options = { persist: true, remoteBindings: true };\nexport default options;\n");
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-payload-admin.ts"));\nconst cloudflare: CloudflareContext =\n\tisCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] || !process.env["CLOUDFLARE_API_TOKEN"]\n\t\t? await getCloudflareContextFromWrangler()\n\t\t: await getCloudflareContext({ async: true });\n',
		);
		write(path.join(templateRoot, "template.cfworkers/script/pull-template.test.js"), 'const templateDirectory = "template.cfworkers";\n');
		git(templateRoot, "add", ".");
		git(templateRoot, "commit", "-m", "update template");

		const result = spawnSync(pullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8" });
		assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
		assert.equal(fs.existsSync(path.join(consumerRoot, "TODO.md")), false);
		assert.equal(spawnSync("git", ["ls-files", "template.cfworkers"], { cwd: consumerRoot, encoding: "utf8" }).stdout, "");
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), consumerWorkflowNamePattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), payloadBranchPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/next.config.ts"), "utf8"), remoteBindingsPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), cloudflareTokenGuardPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), consumerPayloadCliPattern);
		assert.equal(
			fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/script/pull-template.test.js"), "utf8"),
			'const templateDirectory = "template.cfworkers";\n',
		);
		assert.equal(spawnSync("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: consumerRoot, encoding: "utf8" }).stdout, "");
	} finally {
		fs.rmSync(fixtureRoot, { force: true, recursive: true });
	}
});
