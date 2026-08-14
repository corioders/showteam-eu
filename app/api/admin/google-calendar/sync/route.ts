import { database, googleCalendarEnv } from "@payload-config";
import { isAdmin, validSameOrigin } from "@/lib/admin-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { syncGoogleCalendar } from "@/lib/google-calendar";

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  if (!await isAdmin(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  await ensureOperationalTables(database);
  try {
    const result = await syncGoogleCalendar(database, googleCalendarEnv, true);
    if (result === "not-connected") return Response.json({ error: "Najpierw połącz konto Google." }, { status: 409 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Google Calendar nie odpowiedział. Połączenie nie zostało usunięte — spróbuj ponownie za chwilę." }, { status: 502 });
  }
}
