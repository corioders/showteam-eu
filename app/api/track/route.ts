import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureOperationalTables } from "@/lib/operational-tables";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  if (!/^\/[a-z0-9/_-]*$/i.test(path) || path.length > 160 || path.startsWith("/a/") || path.startsWith("/api")) return NextResponse.json({ ok: false }, { status: 400 });
  const { env } = await getCloudflareContext({ async: true });
  await ensureOperationalTables(env.D1);
  const rateLimit = await checkRateLimit(env.D1, request, "analytics", 120, 60);
  if (!rateLimit.allowed) return new NextResponse(null, { status: 204 });
  const day = new Date().toISOString().slice(0, 10);
  await env.D1.prepare("INSERT INTO analytics (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1").bind(day, path).run();
  await env.D1.prepare("DELETE FROM analytics WHERE day < date('now', '-30 days')").run();
  return new NextResponse(null, { status: 204 });
}
