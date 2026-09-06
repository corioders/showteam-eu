import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const pullTemplate = path.resolve(import.meta.dirname, "..", "..", "pull_template.sh");
const payloadBranchPattern = /- payload/;
const remoteBindingsPattern = /remoteBindings: true/;
const cloudflareTokenGuardPattern = /process\.env\["CLOUDFLARE_API_TOKEN"\]/;
const consumerPayloadCliPattern = /seed-ci\.ts/;
const formattedCloudflareContextPattern = /CloudflareContext[^\n]* =\n\tisCLI/;
const sharedInvariantPattern = /shared scheduler and deploy workflow/;
const customValidationEnvironmentPattern = /PAYLOAD_SECRET: local-ci-secret/;
const localValidationPathPattern = /CSTD_D1_PERSIST_PATH="\.wrangler\/state\/v3"/;
const consumerD1SnapshotPattern = /Consumer-only D1 snapshot/;
const templatePayloadSeedPattern = /New template Payload seed/;
const sharedDeployWorkflowPattern = /\.\/\.github\/workflows\/_deploy\.yml/;
const consumerDeployInputsPattern = /worker-name: showteam-eu-cfworkers[\s\S]+preview-worker-name: showteam-eu-cfworkers-preview[\s\S]+payload: true/;
const normalizedWorkerNamesPattern = /"name":"showteam-eu-cfworkers"[\s\S]+"service":"corioders-dashboard-cfworkers"[\s\S]+"name":"showteam-eu-cfworkers-preview"/;
const consumerPayloadCommandsPattern = /payload-d1-binding: D1[\s\S]+payload-local-migrate-command: pnpm migrate:local[\s\S]+payload-seed-production: false/;
const installPlaywrightInputPattern = /install-playwright: true/;
const productionHealthInputPattern = /production-health-url: https:\/\/showteam\.example\/health/;
const payloadAuthTestPattern = /template Payload login/;
const coreUsersPattern = /"core users"/;
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
		write(path.join(templateRoot, ".github/workflows/validate.yml"), "name: Validate template\n");
		fs.copyFileSync(pullTemplate, path.join(templateRoot, "pull_template.sh"));
		fs.chmodSync(path.join(templateRoot, "pull_template.sh"), 0o755);
		write(path.join(templateRoot, "TODO.md"), "template task\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/next.config.ts"), "const options = { persist: true };\nexport default options;\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/tests/e2e/payload.spec.ts"), 'test("template Payload login", () => {});\n');
		write(path.join(templateRoot, "template.cfworkers/apps/web/scripts/seed-payload-admin.ts"), 'const username = "corioders";\n');
		write(path.join(templateRoot, "template.cfworkers/apps/web/playwright.config.ts"), 'const username = "corioders";\n');
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/wrangler.jsonc"),
			'{"name":"template-cfworkers-web","services":[{"binding":"WORKER_SELF_REFERENCE","service":"template-cfworkers-web"},{"binding":"CORIODERS_TELEMETRY","service":"corioders-dashboard-cfworkers-web"}],"env":{"preview":{"name":"template-cfworkers-web-preview","services":[{"binding":"WORKER_SELF_REFERENCE","service":"template-cfworkers-web-preview"}]}}}\n',
		);
		write(
			path.join(templateRoot, "template.cfworkers/script/check-template-invariants.js"),
			'const deployWorkflow = read("../.github/workflows/deploy.yml");\nrequireMatch(deployWorkflow, /APP_ENV/);\nconst packageJson = {};\n',
		);
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-payload-admin.ts"));\nconst isNextBuild = process.env["NEXT_PHASE"] === "phase-production-build";\nconst cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =\n\tisCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] || !process.env["CLOUDFLARE_API_TOKEN"] ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });\n',
		);
		git(templateRoot, "add", ".");
		git(templateRoot, "commit", "-m", "initial template");

		git(fixtureRoot, "clone", templateRoot, consumerRoot);
		git(consumerRoot, "config", "user.email", "test@corioders.com");
		git(consumerRoot, "config", "user.name", "Corioders Test");
		git(consumerRoot, "remote", "rename", "origin", "template");
		fs.renameSync(path.join(consumerRoot, "template.cfworkers"), path.join(consumerRoot, "showteam.cfworkers"));
		fs.renameSync(
			path.join(consumerRoot, "showteam.cfworkers/apps/web/tests/e2e/payload.spec.ts"),
			path.join(consumerRoot, "showteam.cfworkers/apps/web/tests/e2e/payload-auth.spec.ts"),
		);
		fs.renameSync(
			path.join(consumerRoot, "showteam.cfworkers/apps/web/scripts/seed-payload-admin.ts"),
			path.join(consumerRoot, "showteam.cfworkers/apps/web/scripts/seed-ci.ts"),
		);
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
			'const isCLI = process.argv.some((value) => value.endsWith("seed-ci.ts"));\nconst isNextBuild = process.env["NEXT_PHASE"] === "phase-production-build";\nconst cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =\n\tisCLI || !isProduction || process.env.CSTD_D1_PERSIST_PATH || !process.env["CLOUDFLARE_API_TOKEN"] ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });\n',
		);
		write(
			path.join(consumerRoot, "showteam.cfworkers/apps/web/package.json"),
			'{"scripts":{"migrate:local":"payload migrate","seed:local":"tsx scripts/seed-ci.ts","deploy:database:preview":"payload migrate","seed:preview":"tsx scripts/seed-ci.ts","deploy:database":"payload migrate"}}\n',
		);
		write(
			path.join(consumerRoot, "showteam.cfworkers/apps/web/wrangler.jsonc"),
			'{"name":"showteam-eu","services":[{"binding":"CORIODERS_TELEMETRY","service":"corioders-dashboard-cfworkers-web"}],"r2_buckets":[{"binding":"NEXT_INC_CACHE_R2_BUCKET","bucket_name":"showteam-next-cache"}],"d1_databases":[{"binding":"D1"}],"env":{"preview":{"name":"showteam-eu-preview","r2_buckets":[{"binding":"NEXT_INC_CACHE_R2_BUCKET","bucket_name":"showteam-preview-next-cache"}]}}}\n',
		);
		write(
			path.join(consumerRoot, "showteam.cfworkers/script/check-template-invariants.js"),
			'const deployWorkflow = read("../.github/workflows/deploy.yml");\nrequireMatch(deployWorkflow, /APP_ENV/);\nrequireMatch(deployWorkflow, /Infisical/);\nconst packageJson = {};\n',
		);
		write(path.join(consumerRoot, ".github/workflows/validate.yml"), "name: Consumer legacy validate\n");
		fs.rmSync(path.join(consumerRoot, "TODO.md"));
		git(consumerRoot, "add", "-A");
		git(consumerRoot, "commit", "-m", "initialize consumer");

		write(
			path.join(templateRoot, ".github/workflows/deploy.yml"),
			`# Deploys template.cfworkers\non:\n  push:\n    branches:\n      - main\n      - payload\n      - deploy\nsteps:\n  - name: Validate, build, and run browser tests\n    run: CSTD_D1_PERSIST_PATH="${runnerTempExpression}/cstd-d1-${runIdExpression}-${runAttemptExpression}" pnpm validate:ci\n    working-directory: template.cfworkers\n  - name: Template-only payload migration\n`,
		);
		write(path.join(templateRoot, "TODO.md"), "updated template task\n");
		write(path.join(templateRoot, "template.cfworkers/CONSUMERS.toml"), "version = 1\n");
		write(path.join(templateRoot, "template.cfworkers/apps/web/next.config.ts"), "const options = { persist: true, remoteBindings: true };\nexport default options;\n");
		write(
			path.join(templateRoot, "template.cfworkers/script/check-template-invariants.js"),
			'const deployWorkflow = read("../.github/workflows/deploy.yml");\nrequireMatch(deployWorkflow, /CSTD_D1_PERSIST_PATH/);\nrequireMatch(deployWorkflow, /APP_ENV/);\nconst packageJson = {};\n',
		);
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/payload.config.ts"),
			'const isCLI = process.argv.some((value) => value.endsWith("seed-payload-admin.ts"));\nconst isNextBuild = process.env["NEXT_PHASE"] === "phase-production-build";\nconst cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =\n\tisCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] || (isNextBuild && !process.env["CLOUDFLARE_API_TOKEN"])\n\t\t? await getCloudflareContextFromWrangler()\n\t\t: await getCloudflareContext({ async: true });\n',
		);
		write(path.join(templateRoot, "template.cfworkers/script/pull-template.test.js"), 'const templateDirectory = "template.cfworkers";\n');
		git(templateRoot, "add", ".");
		git(templateRoot, "commit", "-m", "update template");

		const cleanBootstrapEnvironment = { ...process.env, ["CSTD_TEMPLATE_PULL_BOOTSTRAPPED"]: "" };
		const result = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8", env: cleanBootstrapEnvironment });
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
		const localStateResult = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8", env: cleanBootstrapEnvironment });
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
		const versionedLocalStateResult = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8", env: cleanBootstrapEnvironment });
		assert.equal(versionedLocalStateResult.status, 0, `${versionedLocalStateResult.stdout}${versionedLocalStateResult.stderr}`);
		const monolithicWorkflow = fs.readFileSync(consumerWorkflowPath, "utf8");
		assert.match(monolithicWorkflow, customValidationEnvironmentPattern);
		assert.match(monolithicWorkflow, localValidationPathPattern);
		assert.match(monolithicWorkflow, consumerD1SnapshotPattern);
		assert.match(monolithicWorkflow, templatePayloadSeedPattern);
		write(
			consumerWorkflowPath,
			monolithicWorkflow
				.replace("steps:\n", "steps:\n  - name: Install Playwright browsers\n")
				.concat("  - name: Check deployed production\n    run: curl https://showteam.example/health\n"),
		);
		git(consumerRoot, "add", ".github/workflows/deploy.yml");
		git(consumerRoot, "commit", "-m", "customize deployment inputs");
		write(
			templateWorkflowPath,
			`name: Deploy
on:
  push:
    branches:
      - main
      - payload
      - deploy
jobs:
  schedule:
    uses: ./.github/workflows/_schedule-runner.yml
  application:
    needs: schedule
    uses: ./.github/workflows/_deploy.yml
    with:
      runner-label: ${runnerTempExpression}
      app-directory: template.cfworkers
      worker-name: template-cfworkers-web
      preview-worker-name: template-cfworkers-web-preview
      production-cache-bucket: template-cfworkers-next-inc-cache-r2-bucket
      preview-cache-bucket: template-cfworkers-preview-next-inc-cache-r2-bucket
      deploy-enabled: true
      payload: false
    secrets: inherit
`,
		);
		write(
			path.join(templateRoot, "template.cfworkers/apps/web/wrangler.jsonc"),
			'{"name":"template-cfworkers","services":[{"binding":"WORKER_SELF_REFERENCE","service":"template-cfworkers"},{"binding":"CORIODERS_TELEMETRY","service":"corioders-dashboard-cfworkers"}],"env":{"preview":{"name":"template-cfworkers-preview","services":[{"binding":"WORKER_SELF_REFERENCE","service":"template-cfworkers-preview"}]}}}\n',
		);
		write(path.join(templateRoot, "template.cfworkers/apps/web/tests/e2e/payload.spec.ts"), 'test("updated template Payload login", () => {});\n');
		write(path.join(templateRoot, "template.cfworkers/apps/web/scripts/seed-payload-admin.ts"), 'const username = "core users";\n');
		write(path.join(templateRoot, "template.cfworkers/apps/web/playwright.config.ts"), 'const username = "core users";\n');
		fs.rmSync(path.join(templateRoot, ".github/workflows/validate.yml"));
		write(
			path.join(templateRoot, "template.cfworkers/script/check-template-invariants.js"),
			'const deployWorkflow = read("../.github/workflows/deploy.yml");\nerrors.push("shared scheduler and deploy workflow");\nconst packageJson = {};\n',
		);
		git(templateRoot, "add", "-A");
		git(templateRoot, "commit", "-m", "use shared deploy workflow");
		const sharedWorkflowResult = spawnSync(consumerPullTemplate, ["template", "main"], { cwd: consumerRoot, encoding: "utf8", env: cleanBootstrapEnvironment });
		assert.equal(sharedWorkflowResult.status, 0, `${sharedWorkflowResult.stdout}${sharedWorkflowResult.stderr}`);
		assert.equal(fs.existsSync(path.join(consumerRoot, "TODO.md")), false);
		assert.equal(fs.existsSync(path.join(consumerRoot, "showteam.cfworkers/CONSUMERS.toml")), false);
		assert.equal(fs.readFileSync(path.join(consumerRoot, "pull_template.sh"), "utf8"), fs.readFileSync(pullTemplate, "utf8"));
		assert.equal(spawnSync("git", ["ls-files", "template.cfworkers"], { cwd: consumerRoot, encoding: "utf8" }).stdout, "");
		const sharedWorkflow = fs.readFileSync(path.join(consumerRoot, ".github/workflows/deploy.yml"), "utf8");
		assert.match(sharedWorkflow, payloadBranchPattern);
		assert.match(sharedWorkflow, sharedDeployWorkflowPattern);
		assert.match(sharedWorkflow, consumerDeployInputsPattern);
		assert.match(sharedWorkflow, consumerPayloadCommandsPattern);
		assert.match(sharedWorkflow, installPlaywrightInputPattern);
		assert.match(sharedWorkflow, productionHealthInputPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/wrangler.jsonc"), "utf8"), normalizedWorkerNamesPattern);
		assert.equal(fs.existsSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/tests/e2e/payload.spec.ts")), false);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/tests/e2e/payload-auth.spec.ts"), "utf8"), payloadAuthTestPattern);
		assert.equal(fs.existsSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/scripts/seed-payload-admin.ts")), false);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/scripts/seed-ci.ts"), "utf8"), coreUsersPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/playwright.config.ts"), "utf8"), coreUsersPattern);
		assert.equal(sharedWorkflow.includes("Template-only payload migration"), false);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/next.config.ts"), "utf8"), remoteBindingsPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), cloudflareTokenGuardPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), consumerPayloadCliPattern);
		assert.match(fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/apps/web/payload.config.ts"), "utf8"), formattedCloudflareContextPattern);
		assert.equal(fs.existsSync(path.join(consumerRoot, ".github/workflows/validate.yml")), false);
		const consumerInvariant = fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/script/check-template-invariants.js"), "utf8");
		assert.match(consumerInvariant, sharedInvariantPattern);
		assert.equal(consumerInvariant.includes("Infisical"), false);
		assert.equal(
			fs.readFileSync(path.join(consumerRoot, "showteam.cfworkers/script/pull-template.test.js"), "utf8"),
			'const templateDirectory = "template.cfworkers";\n',
		);
		assert.equal(spawnSync("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: consumerRoot, encoding: "utf8" }).stdout, "");
	} finally {
		fs.rmSync(fixtureRoot, { force: true, recursive: true });
	}
});
