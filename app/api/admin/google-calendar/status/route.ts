import { database, googleCalendarEnv } from "@payload-config";
import { isAdmin } from "@/lib/admin-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { getGoogleCalendarConnection, googleCalendarConfig } from "@/lib/google-calendar";

export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  await ensureOperationalTables(database);
  const connection = await getGoogleCalendarConnection(database);
  return Response.json({
    configured: Boolean(googleCalendarConfig(googleCalendarEnv)),
    connected: Boolean(connection),
    calendarName: connection?.calendar_name,
    accountEmail: connection?.account_email,
    lastSyncedAt: connection?.last_synced_at,
    callbackUrl: new URL("/api/admin/google-calendar/callback", request.url).toString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
