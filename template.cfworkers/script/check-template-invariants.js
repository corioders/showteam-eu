import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultWorkspaceDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDirectory = process.argv[2] ? path.resolve(process.argv[2]) : defaultWorkspaceDirectory;
const errors = [];
const previewResourcePattern = /preview/i;
const nonNewlinePattern = /[^\n]/g;
const whitespacePattern = /\s/;

function read(relativePath) {
	return fs.readFileSync(path.join(workspaceDirectory, relativePath), "utf8");
}

function readJsonString(contents, startIndex) {
	for (let index = startIndex + 1; index < contents.length; index += 1) {
		if (contents[index] === "\\") {
			index += 1;
			continue;
		}
		if (contents[index] === '"') {
			return [contents.slice(startIndex, index + 1), index];
		}
	}
	return [contents.slice(startIndex), contents.length - 1];
}

function stripJsonComments(contents) {
	let result = "";
	for (let index = 0; index < contents.length; index += 1) {
		if (contents[index] === '"') {
			const [jsonString, endIndex] = readJsonString(contents, index);
			result += jsonString;
			index = endIndex;
			continue;
		}
		if (contents.startsWith("//", index)) {
			const endIndex = contents.indexOf("\n", index + 2);
			if (endIndex === -1) {
				break;
			}
			result += "\n";
			index = endIndex;
			continue;
		}
		if (contents.startsWith("/*", index)) {
			const endIndex = contents.indexOf("*/", index + 2);
			if (endIndex === -1) {
				result += "/";
				break;
			}
			result += contents.slice(index, endIndex + 2).replace(nonNewlinePattern, "");
			index = endIndex + 1;
			continue;
		}
		result += contents[index];
	}
	return result;
}

function stripTrailingCommas(contents) {
	let result = "";
	for (let index = 0; index < contents.length; index += 1) {
		if (contents[index] === '"') {
			const [jsonString, endIndex] = readJsonString(contents, index);
			result += jsonString;
			index = endIndex;
			continue;
		}
		if (contents[index] === ",") {
			let nextIndex = index + 1;
			while (whitespacePattern.test(contents[nextIndex] ?? "")) {
				nextIndex += 1;
			}
			if (contents[nextIndex] === "}" || contents[nextIndex] === "]") {
				continue;
			}
		}
		result += contents[index];
	}
	return result;
}

function parseJsonc(contents) {
	return JSON.parse(stripTrailingCommas(stripJsonComments(contents)));
}

function requireMatch(contents, pattern, message) {
	if (!pattern.test(contents)) {
		errors.push(message);
	}
}

function values(contents, key) {
	return [...contents.matchAll(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "g"))].map((match) => match[1]);
}

const nextConfig = read("apps/web/next.config.ts");
requireMatch(nextConfig, /\.\.\.cstdNextConfig/, "apps/web/next.config.ts must extend cstdNextConfig.");
requireMatch(nextConfig, /cacheComponents:\s*true/, "apps/web/next.config.ts must keep Cache Components enabled.");
requireMatch(nextConfig, /reactCompiler:\s*true/, "apps/web/next.config.ts must keep the React compiler enabled.");
requireMatch(nextConfig, /initOpenNextCloudflareForDev\(\{/, "apps/web/next.config.ts must initialize the Cloudflare development context with explicit options.");
requireMatch(nextConfig, /CSTD_D1_PERSIST_PATH/, "apps/web/next.config.ts must isolate persisted Cloudflare state when a path is provided.");
requireMatch(
	nextConfig,
	/remoteBindings:\s*Boolean\(process\.env\["CLOUDFLARE_API_TOKEN"\]\)/,
	"apps/web/next.config.ts must enable remote bindings only when Cloudflare authentication is available.",
);
if (/cacheComponents:\s*false/.test(nextConfig)) {
	errors.push("apps/web/next.config.ts must not disable Cache Components.");
}

const openNextConfig = read("apps/web/open-next.config.ts");
requireMatch(openNextConfig, /incremental-cache\/r2-incremental-cache/, "apps/web/open-next.config.ts must keep the R2 incremental-cache adapter.");
requireMatch(openNextConfig, /tag-cache\/d1-next-tag-cache/, "apps/web/open-next.config.ts must keep the D1 tag-cache adapter.");
requireMatch(openNextConfig, /incrementalCache:\s*r2IncrementalCache/, "apps/web/open-next.config.ts must configure the R2 incremental cache.");
requireMatch(openNextConfig, /tagCache:\s*d1NextTagCache/, "apps/web/open-next.config.ts must configure the D1 tag cache.");

const wranglerConfig = read("apps/web/wrangler.jsonc");
const environmentIndex = wranglerConfig.indexOf('\n\t"env":');
if (environmentIndex === -1) {
	errors.push("apps/web/wrangler.jsonc must define environment-specific bindings.");
} else {
	const productionConfig = wranglerConfig.slice(0, environmentIndex);
	const previewConfig = wranglerConfig.slice(environmentIndex);
	for (const key of ["bucket_name", "database_name", "database_id"]) {
		const productionValues = values(productionConfig, key);
		const previewValues = values(previewConfig, key);
		if (key !== "database_id" && productionValues.some((value) => previewResourcePattern.test(value))) {
			errors.push(`Production ${key} values must not reference preview resources.`);
		}
		const sharedValues = productionValues.filter((value) => previewValues.includes(value));
		if (sharedValues.length > 0) {
			errors.push(`Production and preview must not share ${key}: ${sharedValues.join(", ")}.`);
		}
	}
}

for (const binding of ["NEXT_INC_CACHE_R2_BUCKET", "NEXT_TAG_CACHE_D1"]) {
	const count = values(wranglerConfig, "binding").filter((value) => value === binding).length;
	if (count !== 2) {
		errors.push(`apps/web/wrangler.jsonc must keep production and preview ${binding} bindings.`);
	}
}

const tagCacheIds = [...wranglerConfig.matchAll(/"binding"\s*:\s*"NEXT_TAG_CACHE_D1"[\s\S]{0,300}?"database_id"\s*:\s*"([^"]*)"/g)].map((match) => match[1]);
const sourceTemplate = fs.existsSync(path.join(workspaceDirectory, "CONSUMERS.md"));
const databaseIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const allowedPlaceholders = new Set(["REPLACE_WITH_PRODUCTION_D1_DATABASE_ID", "REPLACE_WITH_PREVIEW_D1_DATABASE_ID"]);
if (tagCacheIds.length !== 2) {
	errors.push("apps/web/wrangler.jsonc must define two tag-cache database IDs.");
} else {
	for (const databaseId of tagCacheIds) {
		if (!databaseIdPattern.test(databaseId) && !(sourceTemplate && allowedPlaceholders.has(databaseId))) {
			errors.push(`Invalid NEXT_TAG_CACHE_D1 database_id: ${databaseId || "<empty>"}.`);
		}
	}
}

const infisicalConfig = JSON.parse(read(".infisical.json"));
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(infisicalConfig.workspaceId ?? "")) {
	errors.push(".infisical.json must link a valid Infisical project ID.");
}
if (infisicalConfig.defaultEnvironment !== "dev") {
	errors.push(".infisical.json must default to the dev environment.");
}
if (!/^https:\/\/[^/]+$/.test(infisicalConfig.domain ?? "")) {
	errors.push(".infisical.json must pin an HTTPS Infisical domain.");
}

const deployWorkflow = read("../.github/workflows/deploy.yml");
requireMatch(
	deployWorkflow,
	/push:\s*\n\s+branches:\s*\n\s+- main\s*\n\s+- payload\s*\n\s+- deploy/,
	"The deploy workflow must validate every pushed main and payload commit while preserving deploy production pushes.",
);
const workflowsDirectory = path.join(workspaceDirectory, "..", ".github", "workflows");
const directWindowsRunnerPattern = /runs-on:\s*\[\s*self-hosted\s*,\s*["']?win24-wsl(?:-poland20)?["']?\s*\]/;
for (const workflowName of fs.readdirSync(workflowsDirectory)) {
	if (!workflowName.endsWith(".yml") && !workflowName.endsWith(".yaml")) {
		continue;
	}
	if (directWindowsRunnerPattern.test(fs.readFileSync(path.join(workflowsDirectory, workflowName), "utf8"))) {
		errors.push(`${workflowName} must reserve a dynamic worker through schedule-runner.yml instead of targeting win24-wsl directly.`);
	}
}
for (const obsoleteWorkflow of ["schedule-runner.yml", "validate.yml"]) {
	if (fs.existsSync(path.join(workflowsDirectory, obsoleteWorkflow))) {
		errors.push(`${obsoleteWorkflow} is obsolete; applications use the underscored reusable workflows.`);
	}
}
requireMatch(deployWorkflow, /uses:\s*\.\/\.github\/workflows\/_schedule-runner\.yml/, "The deploy workflow must call the local shared scheduler.");
requireMatch(deployWorkflow, /uses:\s*\.\/\.github\/workflows\/_deploy\.yml/, "The deploy workflow must call the local shared deploy workflow.");
for (const reusableWorkflow of ["_schedule-runner.yml", "_deploy.yml"]) {
	if (!fs.existsSync(path.join(workflowsDirectory, reusableWorkflow))) {
		errors.push(`${reusableWorkflow} must be distributed with the template.`);
	}
}
const sharedDeployWorkflow = read("../.github/workflows/_deploy.yml");
requireMatch(sharedDeployWorkflow, /payload-local-admin-username:[\s\S]*default:\s*corioders/, "Shared validation must default the local Payload username.");
requireMatch(sharedDeployWorkflow, /payload-local-admin-password:[\s\S]*default:\s*admin/, "Shared validation must default the local Payload password.");
requireMatch(
	sharedDeployWorkflow,
	/Validate, build, and run browser tests[\s\S]*PAYLOAD_ADMIN_USERNAME:/,
	"Shared validation must isolate local Payload credentials from Infisical deployment credentials.",
);
requireMatch(sharedDeployWorkflow, /PLAYWRIGHT_CACHE="\$RUNNER_TEMP\/ms-playwright"/, "Shared Playwright installation must use writable runner storage.");
requireMatch(deployWorkflow, /needs:\s*schedule/, "The application workflow must wait for the shared scheduler.");
requireMatch(
	deployWorkflow,
	/runner-label:\s*\$\{\{ needs\.schedule\.outputs\.runner-label \}\}/,
	"The application workflow must pass the reserved runner label to the shared deploy workflow.",
);
for (const inputName of ["app-directory", "worker-name", "preview-worker-name", "production-cache-bucket", "preview-cache-bucket", "deploy-enabled", "payload"]) {
	requireMatch(deployWorkflow, new RegExp(`\\s${inputName}:\\s*\\S+`), `The application workflow must explicitly set ${inputName}.`);
}
requireMatch(deployWorkflow, /secrets:\s*inherit/, "The application workflow must pass deployment secrets to the shared workflow.");
if (/\bruns-on:|\bsteps:/.test(deployWorkflow)) {
	errors.push("The application deploy workflow must remain a thin reusable-workflow caller.");
}
const expectsPayload = fs.existsSync(path.join(workspaceDirectory, "apps/web/payload.config.ts"));
requireMatch(
	deployWorkflow,
	new RegExp(`payload:\\s*${expectsPayload ? "true" : "false"}`),
	`The application workflow must declare payload: ${expectsPayload} for its selected template profile.`,
);

const packageJson = JSON.parse(read("package.json"));
const turboConfig = JSON.parse(read("turbo.json"));
if (!turboConfig.globalPassThroughEnv?.includes("CLOUDFLARE_API_TOKEN")) {
	errors.push("turbo.json must pass CLOUDFLARE_API_TOKEN through to builds using remote Cloudflare bindings.");
}
if (packageJson.scripts?.["resolve-build-inputs"] !== "node script/resolve-external-build-inputs.js") {
	errors.push("package.json must expose the external build-input resolver.");
}
if (packageJson.scripts?.dev !== "infisical run --env=staging -- dotenv -e apps/web/.env -e apps/web/.env.local -o -- turbo run dev --env-mode=loose") {
	errors.push("package.json dev must load staging secrets and then apply local environment overrides.");
}
for (const scriptName of ["dev", "preview", "deploy", "logs", "logs:preview", "shadcn:search", "shadcn:add", "shadcn:patch"]) {
	if (!/^infisical run(?: --env=[a-z]+)? -- /.test(packageJson.scripts?.[scriptName] ?? "")) {
		errors.push(`package.json script ${scriptName} must inject Infisical secrets.`);
	}
}

const expectedDevScript = "infisical run --env=staging -- dotenv -e apps/web/.env -e apps/web/.env.local -o -- turbo run dev --env-mode=loose";
if (packageJson.scripts?.dev !== expectedDevScript) {
	errors.push("root dev script must load staging Infisical secrets, allow local dotenv overrides, and preserve injected variables through Turborepo");
}

if (fs.existsSync(path.join(workspaceDirectory, "apps/web/payload.config.ts"))) {
	const payloadConfig = read("apps/web/payload.config.ts");
	requireMatch(
		payloadConfig,
		/importMap:\s*\{[^}]*autoGenerate:\s*false/,
		"Payload import-map generation must be explicit instead of rewriting files during development.",
	);
	requireMatch(payloadConfig, /typescript:\s*\{[^}]*autoGenerate:\s*false/, "Payload type generation must be explicit instead of rewriting files during development.");
	requireMatch(payloadConfig, /!process\.env\["CLOUDFLARE_API_TOKEN"\]/, "Payload builds without Cloudflare authentication must use local bindings.");
}

const biomeConfig = read("biome.jsonc");
requireMatch(biomeConfig, /no-throw\.grit/, "biome.jsonc must keep the no-throw plugin.");
try {
	const biomeConfigObject = parseJsonc(biomeConfig);
	if (!biomeConfigObject.extends?.includes("./packages/corioders-lib/cstd-ts/config/biome.jsonc")) {
		errors.push("biome.jsonc must extend the shared cstd-ts configuration.");
	}
	for (const rule of ["noDefaultExport", "useNamingConvention"]) {
		if (biomeConfigObject.linter?.rules?.style?.[rule] === "off") {
			errors.push(`biome.jsonc must not disable ${rule} workspace-wide.`);
		}
	}
	// Narrow overrides remain available for framework boundaries and generated code.
} catch (error) {
	errors.push(`biome.jsonc must remain valid JSONC: ${error instanceof Error ? error.message : String(error)}.`);
}

const agentRules = read("AGENTS.md");
for (const [pattern, message] of [
	[/SHADCN-ONLY UI IS MANDATORY/, "AGENTS.md must require shadcn-only UI."],
	[/DO NOT RESTYLE REGISTRY CODE/, "AGENTS.md must forbid restyling registry code."],
	[/Do not create a custom UI component, custom styled substitute, or bespoke visual implementation/, "AGENTS.md must forbid custom UI implementations."],
	[/treat every generated component and block file as immutable vendor UI/, "AGENTS.md must make installed registry UI immutable."],
	[/Never hand-create a visual `\.tsx` component/, "AGENTS.md must forbid hand-created TSX UI components."],
	[/Application-authored route, feature, and wiring files must not contain visual `className`/, "AGENTS.md must forbid app-authored visual styling."],
	[
		/A page assembled from shadcn primitives with new layout classes or bespoke markup is custom UI and is forbidden/,
		"AGENTS.md must forbid bespoke primitive composition.",
	],
	[/every `className`\/`style` byte-for-byte unchanged from the post-install result/, "AGENTS.md must preserve registry visual code byte-for-byte."],
	[
		/Any JSX-structure or visual-style diff outside an approved compatibility patch is a failed implementation/,
		"AGENTS.md must reject structural or visual registry drift.",
	],
	[/If shadcn truly has no applicable primitive, stop and ask the user/, "AGENTS.md must require user direction instead of a custom UI fallback."],
	[
		/generic compatibility fixes required after `shadcn:add` reports an unknown or stale incompatibility/,
		"AGENTS.md must limit registry edits to compatibility patches.",
	],
	[/shadcn:patch` rejects a missing, unchanged, or failing unit test/, "AGENTS.md must require a fresh cstd-next unit test before patching."],
	[/Never target `win24-wsl` or a concrete worker label directly/, "AGENTS.md must forbid bypassing the dynamic runner scheduler."],
]) {
	requireMatch(agentRules, pattern, message);
}

const appPackage = JSON.parse(read("apps/web/package.json"));
if (!appPackage.scripts?.prebuild?.includes("cstd-next-clean-images")) {
	errors.push("apps/web/package.json must keep cstd-next-clean-images in prebuild.");
}
if (!appPackage.scripts?.postbuild?.includes("cstd-next-finalize-images")) {
	errors.push("apps/web/package.json must keep cstd-next-finalize-images in postbuild.");
}
if (!appPackage.scripts?.["build:worker"]?.includes("--skipNextBuild")) {
	errors.push("apps/web/package.json must transform the existing Next.js output instead of rebuilding it.");
}

const appTurboConfig = JSON.parse(read("apps/web/turbo.json"));
if (appTurboConfig.tasks?.build?.cache === false) {
	errors.push("apps/web/turbo.json must keep application build caching enabled.");
}
if (!fs.existsSync(path.join(workspaceDirectory, "apps/web/public/.assetsignore"))) {
	errors.push("apps/web/public/.assetsignore must be preserved.");
}

if (errors.length > 0) {
	for (const error of errors) {
		process.stderr.write(`- ${error}\n`);
	}
	process.exitCode = 1;
} else {
	process.stdout.write("Template invariants OK.\n");
}
