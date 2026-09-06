import "cstd-next/media/image/webpack-loader/image-types.d.ts";

declare global {
	interface CloudflareEnv {
		// biome-ignore lint/style/useNamingConvention: Cloudflare binding names are uppercase.
		CORIODERS_TELEMETRY?: Fetcher;
		// biome-ignore lint/style/useNamingConvention: Cloudflare binding names are uppercase.
		PAYLOAD_DB: D1Database;
		// biome-ignore lint/style/useNamingConvention: Cloudflare binding names are uppercase.
		PAYLOAD_MEDIA: R2Bucket;
	}
}
