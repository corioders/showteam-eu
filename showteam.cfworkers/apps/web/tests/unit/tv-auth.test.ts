// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
import { describe, expect, it } from "vitest";

import { createTvToken, tvCookie, verifyTvToken } from "../../src/lib/tv-auth";

function database() {
	const devices = new Map<string, string>();
	return {
		devices,
		prepare(query: string) {
			const values: unknown[] = [];
			return {
				bind(...input: unknown[]) {
					values.push(...input);
					return this;
				},
				async run() {
					if (query.startsWith("INSERT")) {
						devices.set(String(values[0]), String(values[1]));
					}
					return {};
				},
				async first() {
					const hash = devices.get(String(values[0]));
					return hash ? { token_hash: hash } : null;
				},
			};
		},
	};
}

describe("TV authentication", () => {
	it("stays valid while the device is registered and stops after revocation", async () => {
		const db = database();
		const token = await createTvToken(db as unknown as D1Database, "TV 123 456");
		expect(await verifyTvToken(db as unknown as D1Database, token)).toBe(true);
		db.devices.clear();
		expect(await verifyTvToken(db as unknown as D1Database, token)).toBe(false);
	});

	it("uses a persistent, hardened cookie", () => {
		expect(tvCookie("token")).toContain("HttpOnly; Secure; SameSite=Strict; Max-Age=34560000");
	});
});
