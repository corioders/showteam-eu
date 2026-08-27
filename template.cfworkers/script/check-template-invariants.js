import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultWorkspaceDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDirectory = process.argv[2] ? path.resolve(process.argv[2]) : defaultWorkspaceDirectory;
const errors = [];
const previewResourcePattern = /preview/i;

function read(relativePath) {
	return fs.readFileSync(path.join(workspaceDirectory, relativePath), "utf8");
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
	for (const key of ["bucket_name", "database_name"]) {
		const productionNames = values(productionConfig, key);
		const previewNames = values(previewConfig, key);
		if (productionNames.some((name) => previewResourcePattern.test(name))) {
			errors.push(`Production ${key} values must not reference preview resources.`);
		}
		const sharedNames = productionNames.filter((name) => previewNames.includes(name));
		if (sharedNames.length > 0) {
			errors.push(`Production and preview must not share ${key}: ${sharedNames.join(", ")}.`);
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
for (const rule of ["noDefaultExport", "useNamingConvention"]) {
	if (new RegExp(`"${rule}"\\s*:\\s*"off"`).test(biomeConfig)) {
		errors.push(`biome.jsonc must not disable ${rule} workspace-wide.`);
	}
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

for (const extension of ["js", "jsx", "ts", "tsx"]) {
	if (fs.existsSync(path.join(workspaceDirectory, `apps/web/src/middleware.${extension}`))) {
		errors.push(`Next.js middleware.${extension} is deprecated; use proxy.${extension}.`);
	}
}

if (errors.length > 0) {
	for (const error of errors) {
		process.stderr.write(`- ${error}\n`);
	}
	process.exitCode = 1;
} else {
	process.stdout.write("Template invariants OK.\n");
}
