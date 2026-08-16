import { database, googleCalendarEnv } from "@payload-config";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { encryptGoogleToken, googleCalendarConfig, sha256 } from "@/lib/google-calendar";

type TokenResponse = { access_token?: string; refresh_token?: string; error_description?: string };
type CalendarResponse = { id?: string; summary?: string };

export async function GET(request: Request) {
  const resultUrl = new URL("/a/kalendarz", request.url);
  const config = googleCalendarConfig(googleCalendarEnv);
  if (!config) { resultUrl.searchParams.set("google", "not-configured"); return Response.redirect(resultUrl); }
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (!state || !code || url.searchParams.has("error")) { resultUrl.searchParams.set("google", "cancelled"); return Response.redirect(resultUrl); }
  await ensureOperationalTables(database);
  const stateHash = await sha256(state);
  const validState = await database.prepare("DELETE FROM google_calendar_oauth_states WHERE state_hash = ? AND expires_at >= ? RETURNING state_hash")
    .bind(stateHash, Date.now()).first();
  if (!validState) { resultUrl.searchParams.set("google", "invalid-state"); return Response.redirect(resultUrl); }

  const callbackUrl = new URL("/api/admin/google-calendar/callback", request.url).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: callbackUrl, grant_type: "authorization_code" }),
  });
  const tokens = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) {
    resultUrl.searchParams.set("google", "token-error");
    return Response.redirect(resultUrl);
  }
  const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList/primary", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const calendar = await calendarResponse.json() as CalendarResponse;
  if (!calendarResponse.ok || !calendar.id) { resultUrl.searchParams.set("google", "calendar-error"); return Response.redirect(resultUrl); }
  const now = Date.now();
  await database.batch([
    database.prepare("DELETE FROM google_calendar_events"),
    database.prepare("DELETE FROM google_calendar_bookings"),
    database.prepare(`INSERT INTO google_calendar_connections
      (id, calendar_id, calendar_name, account_email, encrypted_refresh_token, sync_token, last_synced_at, sync_started_at, created_at, updated_at)
      VALUES ('primary', ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET calendar_id = excluded.calendar_id, calendar_name = excluded.calendar_name,
      account_email = excluded.account_email, encrypted_refresh_token = excluded.encrypted_refresh_token,
      sync_token = NULL, last_synced_at = NULL, sync_started_at = NULL, updated_at = excluded.updated_at`)
      .bind(calendar.id, calendar.summary || "Kalendarz SHOWteam", calendar.id, await encryptGoogleToken(tokens.refresh_token, config.tokenKey), now, now),
  ]);
  resultUrl.searchParams.set("google", "connected");
  return Response.redirect(resultUrl);
}
