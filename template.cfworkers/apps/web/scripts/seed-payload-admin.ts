// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: One-shot seed configuration is supplied by its caller.
import config, { disposeCloudflareContext } from "@payload-config";
import { getPayload } from "payload";

const isProduction = process.env.NODE_ENV === "production";
const username = process.env["PAYLOAD_ADMIN_USERNAME"] ?? (isProduction ? undefined : "corioders");
const password = process.env["PAYLOAD_ADMIN_PASSWORD"] ?? (isProduction ? undefined : "admin");

if (!username || !password) {
	process.stderr.write("PAYLOAD_ADMIN_USERNAME and PAYLOAD_ADMIN_PASSWORD are required for remote seeds.\n");
	process.exitCode = 1;
} else {
	const payload = await getPayload({ config });
	const existing = await payload.find({ collection: "users", limit: 1, where: { username: { equals: username } } });
	const [existingUser] = existing.docs;
	if (!existingUser) {
		await payload.create({ collection: "users", data: { password, username } });
	} else {
		await payload.update({ collection: "users", id: existingUser.id, data: { password } });
	}
	await payload.destroy();
	await disposeCloudflareContext?.();
}

// Miniflare retains background handles after its explicit disposal in this CLI process.
process.exit(process.exitCode ?? 0);
