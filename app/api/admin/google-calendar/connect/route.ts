import { database, googleCalendarEnv } from "@payload-config";
import { isAdmin } from "@/lib/admin-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { googleCalendarConfig, sha256 } from "@/lib/google-calendar";

export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.redirect(new URL("/admin/login", request.url));
  const config = googleCalendarConfig(googleCalendarEnv);
  if (!config) return Response.redirect(new URL("/a/kalendarz?google=not-configured", request.url));
  await ensureOperationalTables(database);
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  await database.prepare("DELETE FROM google_calendar_oauth_states WHERE expires_at < ?").bind(Date.now()).run();
  await database.prepare("INSERT INTO google_calendar_oauth_states (state_hash, expires_at) VALUES (?, ?)")
    .bind(await sha256(state), Date.now() + 10 * 60_000).run();
  const callbackUrl = new URL("/api/admin/google-calendar/callback", request.url).toString();
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/calendar",
    state,
  }).toString();
  return Response.redirect(authorize);
}
