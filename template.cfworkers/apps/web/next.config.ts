import path from "node:path";
import { fileURLToPath } from "node:url";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { nextConfig as cstdNextConfig } from "cstd-next/config/next.config.js";
import type { NextConfig } from "next";

const vercelOtelEdgePath = fileURLToPath(import.meta.resolve("@vercel/otel")).replace(
	`${path.sep}dist${path.sep}node${path.sep}`,
	`${path.sep}dist${path.sep}edge${path.sep}`,
);

const nextConfig: NextConfig = {
	...cstdNextConfig,
	// Required template capability. Fix incompatible application code instead of disabling Cache Components.
	cacheComponents: true,
	turbopack: {
		...cstdNextConfig.turbopack,
		resolveAlias: {
			...cstdNextConfig.turbopack?.resolveAlias,
			"@vercel/otel": vercelOtelEdgePath,
		},
		root: path.join(import.meta.dirname, "..", ".."),
	},
	outputFileTracingRoot: path.join(import.meta.dirname, "..", ".."),
	outputFileTracingIncludes: {
		"/*": ["../../packages/corioders-lib/cstd-ts/config/tsconfig.json"],
	},
	reactCompiler: true,
};

initOpenNextCloudflareForDev({
	...(process.env["CSTD_D1_PERSIST_PATH"] ? { persist: { path: process.env["CSTD_D1_PERSIST_PATH"] } } : {}),
});

// biome-ignore lint/style/noDefaultExport: Nextjs requirement
export default nextConfig;
