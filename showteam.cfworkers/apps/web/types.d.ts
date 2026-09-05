declare module "@payloadcms/next/css";

export {};

declare global {
	interface CloudflareEnv {
		// biome-ignore lint/style/useNamingConvention: Cloudflare binding names are uppercase.
		CORIODERS_TELEMETRY?: Fetcher;
	}
}
