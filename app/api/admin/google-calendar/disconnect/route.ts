import { database } from "@payload-config";
import { isAdmin, validSameOrigin } from "@/lib/admin-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  if (!await isAdmin(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  await ensureOperationalTables(database);
  await database.batch([
    database.prepare("DELETE FROM google_calendar_events"),
    database.prepare("DELETE FROM google_calendar_bookings"),
    database.prepare("DELETE FROM google_calendar_oauth_states"),
    database.prepare("DELETE FROM google_calendar_connections"),
  ]);
  return Response.json({ ok: true });
}
