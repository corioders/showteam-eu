// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and test environment variables are runtime bindings.
import config, { database } from "@payload-config";
import { connection } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";

async function user(request: Request) {
	const payload = await getPayload({ config });
	return (await payload.auth({ headers: request.headers })).user;
}

export async function GET(request: Request) {
	await connection();
	const currentUser = await user(request);
	if (!currentUser) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	await ensureOperationalTables(database);
	const count = await database.prepare("SELECT COUNT(*) AS total FROM push_subscriptions WHERE user_id = ?").bind(currentUser.id).first<{ total: number }>();
	return Response.json(
		{ publicKey: process.env.VAPID_PUBLIC_KEY || null, subscribed: Boolean(count?.total), receivesNotifications: Boolean(currentUser.receivesNotifications) },
		{ headers: { "Cache-Control": "no-store" } },
	);
}

export async function POST(request: Request) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const currentUser = await user(request);
	if (!currentUser) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
	const endpoint = String(input?.endpoint || "").slice(0, 2000);
	const p256dh = String(input?.keys?.p256dh || "").slice(0, 500);
	const auth = String(input?.keys?.auth || "").slice(0, 200);
	if (!endpoint.startsWith("https://") || !p256dh || !auth) {
		return Response.json({ error: "Nie udało się zapisać tego urządzenia." }, { status: 400 });
	}
	await ensureOperationalTables(database);
	const now = Date.now();
	await database
		.prepare(`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = excluded.updated_at`)
		.bind(crypto.randomUUID(), currentUser.id, endpoint, p256dh, auth, now, now)
		.run();
	return Response.json({ subscribed: true }, { status: 201 });
}

export async function DELETE(request: Request) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const currentUser = await user(request);
	if (!currentUser) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
	const endpoint = String(input?.endpoint || "");
	await ensureOperationalTables(database);
	await database.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?").bind(currentUser.id, endpoint).run();
	return new Response(null, { status: 204 });
}
