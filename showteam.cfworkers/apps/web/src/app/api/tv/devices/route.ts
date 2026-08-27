// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
import config, { database } from "@payload-config";
import { connection } from "next/server";
import { getPayload } from "payload";

import { ensureOperationalTables } from "@/lib/operational-tables";

async function isAdmin(request: Request): Promise<boolean> {
	const payload = await getPayload({ config });
	return Boolean((await payload.auth({ headers: request.headers })).user);
}

export async function GET(request: Request) {
	await connection();
	if (!(await isAdmin(request))) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	await ensureOperationalTables(database);
	const result = await database.prepare("SELECT id, name, created_at FROM tv_devices ORDER BY created_at DESC").all<{ id: string; name: string; created_at: number }>();
	return Response.json(result.results, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
	}
	if (!(await isAdmin(request))) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const id = String(((await request.json()) as { id?: unknown }).id || "");
	if (!/^[0-9a-f-]{36}$/.test(id)) {
		return Response.json({ error: "Nieprawidłowe urządzenie." }, { status: 400 });
	}
	await ensureOperationalTables(database);
	await database.prepare("DELETE FROM tv_devices WHERE id = ?").bind(id).run();
	return Response.json({ ok: true });
}
