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
requireMatch(nextConfig, /initOpenNextCloudflareForDev\(\)/, "apps/web/next.config.ts must initialize the Cloudflare development context.");
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

const rootLayout = read("apps/web/src/app/layout.tsx");
requireMatch(rootLayout, /import\s*\{\s*ThemeProvider\s*\}\s*from\s*"next-themes"/, "The root layout must keep ThemeProvider.");
requireMatch(rootLayout, /<ThemeProvider\b/, "The root layout must render ThemeProvider.");

const appPackage = JSON.parse(read("apps/web/package.json"));
if (!appPackage.scripts?.prebuild?.includes("cstd-next-clean-images")) {
	errors.push("apps/web/package.json must keep cstd-next-clean-images in prebuild.");
}
if (!appPackage.scripts?.postbuild?.includes("cstd-next-finalize-images")) {
	errors.push("apps/web/package.json must keep cstd-next-finalize-images in postbuild.");
}

const appTurboConfig = JSON.parse(read("apps/web/turbo.json"));
if (appTurboConfig.tasks?.build?.cache !== false) {
	errors.push("apps/web/turbo.json must keep application build caching disabled.");
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
