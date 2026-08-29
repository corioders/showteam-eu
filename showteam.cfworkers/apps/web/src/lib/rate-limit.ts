// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and test environment variables are runtime bindings.
type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export async function checkRateLimit(database: D1Database, request: Request, scope: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
	const now = Date.now();
	const windowMs = windowSeconds * 1000;
	const windowEnd = Math.floor(now / windowMs + 1) * windowMs;
	const address = request.headers.get("cf-connecting-ip") || "local";
	const secret = process.env.PAYLOAD_SECRET || "development";
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:${address}`));
	const clientHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
	const key = `${scope}:${Math.floor(now / windowMs)}:${clientHash}`;
	const row = await database
		.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count")
		.bind(key, windowEnd)
		.first<{ count: number }>();

	if (Number(row?.count) === 1) {
		await database.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
	}

	return {
		allowed: Number(row?.count || limit + 1) <= limit,
		retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
	};
}
