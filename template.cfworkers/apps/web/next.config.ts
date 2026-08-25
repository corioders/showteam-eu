import path from "node:path";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { nextConfig as cstdNextConfig } from "cstd-next/config/next.config.js";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	...cstdNextConfig,
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

initOpenNextCloudflareForDev();

// biome-ignore lint/style/noDefaultExport: Nextjs requirement
export default nextConfig;
