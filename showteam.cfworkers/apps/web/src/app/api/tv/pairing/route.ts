// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
import { database } from "@payload-config";

import { ensureOperationalTables } from "@/lib/operational-tables";
import { checkRateLimit } from "@/lib/rate-limit";
import { createTvToken, hashPairingSecret, tvCookie } from "@/lib/tv-auth";

function randomSecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Buffer.from(bytes).toString("base64url");
}

export async function POST(request: Request) {
	await ensureOperationalTables(database);
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
	}
	const rateLimit = await checkRateLimit(database, request, "tv-pairing", 20, 10 * 60);
	if (!rateLimit.allowed) {
		return Response.json({ error: "Za dużo prób. Spróbuj ponownie za kilka minut." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
	}
	const now = Date.now();
	await database.prepare("DELETE FROM tv_pairings WHERE expires_at < ?").bind(now).run();
	const outstanding = await database.prepare("SELECT COUNT(*) AS count FROM tv_pairings").first<{ count: number }>();
	if (Number(outstanding?.count || 0) >= 100) {
		return Response.json({ error: "Za dużo aktywnych kodów. Spróbuj za kilka minut." }, { status: 429 });
	}
	const id = crypto.randomUUID();
	const secret = randomSecret();
	const userCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
	await database
		.prepare("INSERT INTO tv_pairings (id, secret_hash, user_code, expires_at, approved) VALUES (?, ?, ?, ?, 0)")
		.bind(id, await hashPairingSecret(secret), userCode, now + 5 * 60_000)
		.run();
	const url = new URL("/a/polacz-tv", request.url);
	url.searchParams.set("pair", id);
	url.searchParams.set("secret", secret);
	return Response.json({ id, secret, userCode, approvalUrl: url.toString(), expiresIn: 300 });
}

export async function GET(request: Request) {
	await ensureOperationalTables(database);
	const url = new URL(request.url);
	const id = url.searchParams.get("id") || "";
	const secret = url.searchParams.get("secret") || "";
	const row = await database
		.prepare("SELECT secret_hash, user_code, expires_at, approved FROM tv_pairings WHERE id = ?")
		.bind(id)
		.first<{ secret_hash: string; user_code: string; expires_at: number; approved: number }>();
	if (!row || row.expires_at < Date.now() || row.secret_hash !== (await hashPairingSecret(secret))) {
		return Response.json({ status: "expired" }, { status: 410 });
	}
	if (!row.approved) {
		return Response.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
	}
	await database.prepare("DELETE FROM tv_pairings WHERE id = ?").bind(id).run();
	const token = await createTvToken(database, `TV ${row.user_code.slice(0, 3)} ${row.user_code.slice(3)}`);
	const response = Response.json({ status: "approved" });
	response.headers.append("Set-Cookie", tvCookie(token));
	return response;
}
