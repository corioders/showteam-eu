import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { ensureOperationalTables } from "@/lib/operational-tables";

async function isAdmin(request: Request): Promise<boolean> {
  const payload = await getPayload({ config });
  return Boolean((await payload.auth({ headers: request.headers })).user);
}

function randomSecret(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  await ensureOperationalTables(database);
  const feeds = await database.prepare("SELECT id, name, created_at FROM calendar_feeds ORDER BY created_at DESC").all<{ id: string; name: string; created_at: number }>();
  return Response.json(feeds.results, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  if (!await isAdmin(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as { name?: unknown };
  const name = String(input.name || "Mój kalendarz").trim().slice(0, 80) || "Mój kalendarz";
  const id = crypto.randomUUID();
  const secret = randomSecret();
  await ensureOperationalTables(database);
  await database.prepare("INSERT INTO calendar_feeds (id, token_hash, name, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, await hashSecret(secret), name, Date.now()).run();
  const url = new URL(`/api/calendar/feed/${id}.${secret}.ics`, request.url).toString();
  return Response.json({ id, name, url, webcalUrl: url.replace(/^https?:/, "webcal:") }, { status: 201 });
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  if (!await isAdmin(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const id = String(((await request.json().catch(() => ({}))) as { id?: unknown }).id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Nieprawidłowa subskrypcja." }, { status: 400 });
  await ensureOperationalTables(database);
  await database.prepare("DELETE FROM calendar_feeds WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
