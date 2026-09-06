// biome-ignore-all lint/style/noDefaultExport: Next.js and Payload configs require default exports.
// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and CLI environment variables are runtime bindings.
// biome-ignore-all lint/plugin/no-throw: Payload config must reject missing production secrets synchronously.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type CloudflareContext, getCloudflareContext } from "@opennextjs/cloudflare";
import { sqliteD1Adapter } from "@payloadcms/db-d1-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { r2Storage } from "@payloadcms/storage-r2";
import { buildConfig } from "payload";
import type { GetPlatformProxyOptions } from "wrangler";

import { Media } from "@/collections/Media";
import { Users } from "@/collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : "");
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join("payload", "bin.js")) || value.endsWith("seed-payload-admin.ts"));
const isProduction = process.env.NODE_ENV === "production";
const isNextBuild = process.env["NEXT_PHASE"] === "phase-production-build";
const payloadSecret = process.env["PAYLOAD_SECRET"] ?? (!isProduction || isNextBuild ? "local-template-secret" : undefined);

if (!payloadSecret) {
	throw new Error("PAYLOAD_SECRET is required at production runtime.");
}

const cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =
	isCLI || !isProduction || process.env["CSTD_D1_PERSIST_PATH"] || !process.env["CLOUDFLARE_API_TOKEN"]
		? await getCloudflareContextFromWrangler()
		: await getCloudflareContext({ async: true });

export const disposeCloudflareContext = cloudflare.dispose?.bind(cloudflare);

export default buildConfig({
	admin: {
		autoLogin: isProduction ? false : { password: "admin", prefillOnly: true, username: "corioders" },
		importMap: { autoGenerate: false, baseDir: dirname },
		user: Users.slug,
	},
	collections: [
		{ ...Media, lockDocuments: false },
		{ ...Users, lockDocuments: false },
	],
	db: sqliteD1Adapter({ binding: cloudflare.env.PAYLOAD_DB, push: false }),
	editor: lexicalEditor(),
	graphQL: { disable: true },
	plugins: [r2Storage({ bucket: cloudflare.env.PAYLOAD_MEDIA, collections: { media: true } })],
	secret: payloadSecret,
	telemetry: false,
	typescript: { autoGenerate: false, outputFile: path.resolve(dirname, "payload-types.ts") },
});

function getCloudflareContextFromWrangler(): Promise<CloudflareContext & { dispose?: () => Promise<void> }> {
	return import(/* webpackIgnore: true */ `${"__wrangler".replaceAll("_", "")}`).then(({ getPlatformProxy }) =>
		getPlatformProxy({
			...(process.env["CLOUDFLARE_ENV"] ? { environment: process.env["CLOUDFLARE_ENV"] } : {}),
			...(process.env["CLOUDFLARE_REMOTE_BINDINGS"] === "true" ? { configPath: path.resolve(dirname, "wrangler.migrations.jsonc") } : {}),
			...(process.env["CSTD_D1_PERSIST_PATH"] ? { persist: { path: process.env["CSTD_D1_PERSIST_PATH"] } } : {}),
			remoteBindings: process.env["CLOUDFLARE_REMOTE_BINDINGS"] === "true",
		} satisfies GetPlatformProxyOptions),
	);
}
