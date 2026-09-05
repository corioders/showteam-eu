import "cstd-next/media/image/webpack-loader/image-types.d.ts";

declare global {
	interface CloudflareEnv {
		// biome-ignore lint/style/useNamingConvention: Cloudflare binding names are uppercase.
		CORIODERS_TELEMETRY?: Fetcher;
	}
}
