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
const formattedCloudflareContextPattern = /CloudflareContext[^\n]* =\n\tisCLI/;
const isolatedValidationPattern = /CSTD_D1_PERSIST_PATH/;
const customValidationEnvironmentPattern = /PAYLOAD_SECRET: local-ci-secret/;
const localValidationPathPattern = /CSTD_D1_PERSIST_PATH="\.wrangler\/state\/v3"/;
const consumerD1SnapshotPattern = /Consumer-only D1 snapshot/;
const templatePayloadSeedPattern = /New template Payload seed/;
const dollarSign = String.fromCharCode(36);
const runnerTempExpression = `${dollarSign}{{ runner.temp }}`;
const runIdExpression = `${dollarSign}{{ github.run_id }}`;
const runAttemptExpression = `${dollarSign}{{ github.run_attempt }}`;

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
	const consumerPullTemplate = path.join(consumerRoot, "pull_template.sh");
	try {
		fs.mkdirSync(templateRoot);
		git(templateRoot, "init", "--initial-branch=main");
		git(templateRoot, "config", "user.email", "test@corioders.com");
		git(templateRoot, "config", "user.name", "Corioders Test");
		write(
			path.join(templateRoot, ".github/workflows/deploy.yml"),
			`# Deploys template.cfworkers\non:\n  push:\n    branches:\n      - deploy\nsteps:\n  - name: Validate, build, and run browser tests\n    env:\n      CSTD_D1_PERSIST_PATH: ${runnerTempExpression}/cstd-d1-${runIdExpression}-${runAttemptExpression}\n    run: pnpm validate:ci\n    working-directory: template.cfworkers\n  - name: Template-only payload migration\n`,
		);
		fs.copyFileSync(pullTemplate, path.join(templateRoot, "pull_template.sh"));
		fs.chmodSync(path.join(templateRoot, "pull_template.sh"), 0o755);
		write(path.join(templateRoot, "TODO.md"), "template task\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/next.config.ts"), "const options = { persist: true };\nexport default options;\n");
		write(
			path.join(templateRoot, "template.cfworkers/script/check-template-invariants.js"),
			"requireMatch(deployWorkflow, /Resolve external build inputs/);\nrequireMatch(deployWorkflow, /APP_ENV/);\n",
		);
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-payload-admin.ts"));\nconst cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =\n\tisCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });\n',
		);
		git(templateRoot, "add", ".");
		git(templateRoot, "commit", "-m", "initial template");

		git(fixtureRoot, "clone", templateRoot, consumerRoot);
		git(consumerRoot, "config", "user.email", "test@corioders.com");
		git(consumerRoot, "config", "user.name", "Corioders Test");
		git(consumerRoot, "remote", "rename", "origin", "template");
		fs.renameSync(path.join(consumerRoot, "template.cfworkers"), path.join(consumerRoot, "showteam.cfworkers"));
		write(
			path.join(consumerRoot, ".github/workflows/deploy.yml"),
			`# Deploys showteam.cfworkers\non:\n  push:\n    branches:\n      - deploy\nsteps:\n  - name: Validate, build, and run browser tests\n    env:\n      CSTD_D1_PERSIST_PATH: ${runnerTempExpression}/cstd-d1-${runIdExpression}-${runAttemptExpression}\n    run: pnpm validate:ci\n    working-directory: showteam.cfworkers\n    env:\n      PAYLOAD_SECRET: local-ci-secret\n`,
		);
		write(
			path.join(consumerRoot, "pull_template.sh"),
			fs
				.readFileSync(path.join(consumerRoot, "pull_template.sh"), "utf8")
				.replace("./template.cfworkers", "./showteam.cfworkers")
				.replace("s/template-cfworkers/", "s/showteam-cfworkers/"),
		);
		fs.chmodSync(path.join(consumerRoot, "pull_template.sh"), 0o755);
		write(
			path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-ci.ts"));\nconst cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =\n\tisCLI || !isProduction || process.env.CSTD_D1_PERSIST_PATH ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });\n',
		);
		write(path.join(consumerRoot, "showteam.cfworkers/script/check-template-invariants.js"), "requireMatch(deployWorkflow, /APP_ENV/);\n");
		fs.rmSync(path.join(consumerRoot, "TODO.md"));
		git(consumerRoot, "add", "-A");
		git(consumerRoot, "commit", "-m", "initialize consumer");

		write(
			path.join(templateRoot, ".github/workflows/deploy.yml"),
			`# Deploys template.cfworkers\non:\n  push:\n    branches:\n      - main\n      - payload\n      - deploy\nsteps:\n  - name: Validate, build, and run browser tests\n    run: CSTD_D1_PERSIST_PATH="${runnerTempExpression}/cstd-d1-${runIdExpression}-${runAttemptExpression}" pnpm validate:ci\n    working-directory: template.cfworkers\n  - name: Template-only payload migration\n`,
		);
		write(path.join(templateRoot, "TODO.md"), "updated template task\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/next.config.ts"), "const options = { persist: true, remoteBindings: true };\nexport default options;\n");
		write(
			path.join(templateRoot, "template.cfworkers/script/check-template-invariants.js"),
			"requireMatch(deployWorkflow, /CSTD_D1_PERSIST_PATH/);\nrequireMatch(deployWorkflow, /Resolve external build inputs/);\nrequireMatch(deployWorkflow, /APP_ENV/);\n",
		);
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-payload-admin.ts"));\nconst cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =\n\tisCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] || !process.env["CLOUDFLARE_API_TOKEN"]\n\t\t? await getCloudflareContextFromWrangler()\n\t\t: await getCloudflareContext({ async: true });\n',
		);
		write(path.join(templateRoot, "template.cfworkers/script/pull-template.test.js"), 'const templateDirectory = "template.cfworkers";\n');
		git(templateRoot, "add", ".");
		git(templateRoot, "commit", "-m", "update template");

		const result = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8" });
		assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
		const templateWorkflowPath = path.join(templateRoot, ".github/workflows/deploy.yml");
		write(
			templateWorkflowPath,
			fs
				.readFileSync(templateWorkflowPath, "utf8")
				.replace(`CSTD_D1_PERSIST_PATH="${runnerTempExpression}/cstd-d1-${runIdExpression}-${runAttemptExpression}"`, 'CSTD_D1_PERSIST_PATH=".wrangler/state"'),
		);
		git(templateRoot, "add", ".github/workflows/deploy.yml");
		git(templateRoot, "commit", "-m", "align local D1 state");
		const localStateResult = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8" });
		assert.equal(localStateResult.status, 0, `${localStateResult.stdout}${localStateResult.stderr}`);
		const consumerWorkflowPath = path.join(consumerRoot, ".github/workflows/deploy.yml");
		write(
			consumerWorkflowPath,
			fs
				.readFileSync(consumerWorkflowPath, "utf8")
				.replace("  - name: Validate, build, and run browser tests", "  - name: Consumer-only D1 snapshot\n  - name: Validate, build, and run browser tests"),
		);
		git(consumerRoot, "add", ".github/workflows/deploy.yml");
		git(consumerRoot, "commit", "-m", "customize consumer D1 workflow");
		write(
			templateWorkflowPath,
			fs
				.readFileSync(templateWorkflowPath, "utf8")
				.replace('CSTD_D1_PERSIST_PATH=".wrangler/state"', 'CSTD_D1_PERSIST_PATH=".wrangler/state/v3"')
				.concat("  - name: New template Payload seed\n"),
		);
		git(templateRoot, "add", ".github/workflows/deploy.yml");
		git(templateRoot, "commit", "-m", "use Wrangler v3 state");
		const versionedLocalStateResult = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8" });
		assert.equal(versionedLocalStateResult.status, 0, `${versionedLocalStateResult.stdout}${versionedLocalStateResult.stderr}`);
		assert.equal(fs.existsSync(path.join(consumerRoot, "TODO.md")), false);
		assert.equal(fs.readFileSync(path.join(consumerRoot, "pull_template.sh"), "utf8"), fs.readFileSync(pullTemplate, "utf8"));
		assert.equal(spawnSync("git", ["ls-files", "template.cfworkers"], { cwd: consumerRoot, encoding: "utf8" }).stdout, "");
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), consumerWorkflowNamePattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), payloadBranchPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), customValidationEnvironmentPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), localValidationPathPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), consumerD1SnapshotPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8"), templatePayloadSeedPattern);
		assert.equal(fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8").includes("Template-only payload migration"), false);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/next.config.ts"), "utf8"), remoteBindingsPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), cloudflareTokenGuardPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), consumerPayloadCliPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), formattedCloudflareContextPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/script/check-template-invariants.js"), "utf8"), isolatedValidationPattern);
		assert.equal(
			fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/script/pull-template.test.js"), "utf8"),
			'const templateDirectory = "template.cfworkers";\n',
		);
		assert.equal(spawnSync("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: consumerRoot, encoding: "utf8" }).stdout, "");
	} finally {
		fs.rmSync(fixtureRoot, { force: true, recursive: true });
	}
});
