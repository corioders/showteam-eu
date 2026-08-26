import path from "node:path";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { withPayload } from "@payloadcms/next/withPayload";
import { nextConfig as cstdNextConfig } from "cstd-next/config/next.config.js";
import type { NextConfig } from "next";

import "./src/env.ts";

const scriptPolicy = process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
const workspaceRoot = path.join(import.meta.dirname, "..", "..");

const nextConfig: NextConfig = {
	...cstdNextConfig,
	async redirects() {
		return [
			{ destination: "/a/dodaj", permanent: false, source: "/dodaj" },
			{ destination: "/a/dodaj/:path*", permanent: false, source: "/dodaj/:path*" },
			{ destination: "/a/kalendarz", permanent: false, source: "/kalendarz" },
			{ destination: "/a/polacz-tv", permanent: false, source: "/polacz-tv" },
			{ destination: "/a/tv", permanent: false, source: "/tv" },
		];
	},
	async headers() {
		return [
			{
				headers: [
					{
						key: "Content-Security-Policy",
						value: `default-src 'self'; ${scriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; manifest-src 'self'`,
					},
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
					{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "SAMEORIGIN" },
				],
				source: "/(.*)",
			},
		];
	},
	experimental: { cpus: 1, staticGenerationMaxConcurrency: 1 },
	images: {
		...cstdNextConfig.images,
		formats: ["image/avif", "image/webp"],
		localPatterns: [{ pathname: "/api/media/file/**" }],
		unoptimized: true,
	},
	outputFileTracingIncludes: { "/*": ["../../packages/corioders-lib/cstd-ts/config/tsconfig.json"] },
	outputFileTracingRoot: workspaceRoot,
	reactCompiler: true,
	serverExternalPackages: ["pg-cloudflare"],
	turbopack: { ...cstdNextConfig.turbopack, root: workspaceRoot },
};

initOpenNextCloudflareForDev();

// biome-ignore lint/style/noDefaultExport: Next.js requires a default config export.
export default withPayload(nextConfig, { devBundleServerPackages: false });
