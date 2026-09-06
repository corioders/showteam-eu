import path from "node:path";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { nextConfig as cstdNextConfig } from "cstd-next/config/next.config.js";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	...cstdNextConfig,
	// Required template capability. Fix incompatible application code instead of disabling Cache Components.
	cacheComponents: true,
	turbopack: {
		...cstdNextConfig.turbopack,
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
	remoteBindings: Boolean(process.env["CLOUDFLARE_API_TOKEN"]),
});

// biome-ignore lint/style/noDefaultExport: Nextjs requirement
export default nextConfig;
