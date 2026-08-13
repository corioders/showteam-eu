import { database } from "@payload-config";
import { createTvToken, hashPairingSecret, tvCookieName } from "@/lib/tv-auth";

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  const now = Date.now();
  await database.prepare("DELETE FROM tv_pairings WHERE expires_at < ?").bind(now).run();
  const outstanding = await database.prepare("SELECT COUNT(*) AS count FROM tv_pairings").first<{ count: number }>();
  if (Number(outstanding?.count || 0) >= 100) return Response.json({ error: "Za dużo aktywnych kodów. Spróbuj za kilka minut." }, { status: 429 });
  const id = crypto.randomUUID();
  const secret = randomSecret();
  const userCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  await database.prepare("INSERT INTO tv_pairings (id, secret_hash, user_code, expires_at, approved) VALUES (?, ?, ?, ?, 0)")
    .bind(id, await hashPairingSecret(secret), userCode, now + 5 * 60_000).run();
  const url = new URL("/polacz-tv", request.url);
  url.searchParams.set("pair", id);
  url.searchParams.set("secret", secret);
  return Response.json({ id, secret, userCode, approvalUrl: url.toString(), expiresIn: 300 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const secret = url.searchParams.get("secret") || "";
  const row = await database.prepare("SELECT secret_hash, expires_at, approved FROM tv_pairings WHERE id = ?")
    .bind(id).first<{ secret_hash: string; expires_at: number; approved: number }>();
  if (!row || row.expires_at < Date.now() || row.secret_hash !== await hashPairingSecret(secret)) {
    return Response.json({ status: "expired" }, { status: 410 });
  }
  if (!row.approved) return Response.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
  await database.prepare("DELETE FROM tv_pairings WHERE id = ?").bind(id).run();
  const response = Response.json({ status: "approved" });
  response.headers.append("Set-Cookie", `${tvCookieName}=${await createTvToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  return response;
}
