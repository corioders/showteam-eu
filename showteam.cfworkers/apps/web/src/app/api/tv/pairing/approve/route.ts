import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { ensureOperationalTables } from "@/lib/operational-tables";
import { hashPairingSecret } from "@/lib/tv-auth";

export async function POST(request: Request) {
	await ensureOperationalTables(database);
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const body = (await request.json()) as { id?: unknown; secret?: unknown };
	const id = String(body.id || "");
	const secret = String(body.secret || "");
	const result = await database
		.prepare("UPDATE tv_pairings SET approved = 1 WHERE id = ? AND secret_hash = ? AND expires_at >= ? AND approved = 0")
		.bind(id, await hashPairingSecret(secret), Date.now())
		.run();
	if (!result.meta.changes) {
		return Response.json({ error: "Kod wygasł albo został już użyty." }, { status: 410 });
	}
	return Response.json({ ok: true });
}
