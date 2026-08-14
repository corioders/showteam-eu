export type GoogleCalendarEnv = {
  GOOGLE_CALENDAR_CLIENT_ID?: string;
  GOOGLE_CALENDAR_CLIENT_SECRET?: string;
  GOOGLE_CALENDAR_TOKEN_KEY?: string;
};

export type GoogleCalendarConnection = {
  calendar_id: string;
  calendar_name: string;
  account_email: string;
  encrypted_refresh_token: string;
  sync_token: string | null;
  last_synced_at: number | null;
};

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
};

type BookingRow = {
  reservation_id: string;
  reference: string;
  equipment_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  phone: string;
  email: string | null;
  customer_notes: string | null;
  staff_notes: string | null;
  status: string;
  updated_at: string;
  mapped_event_id: string | null;
  mapped_updated_at: string | null;
};

type GoogleConfig = { clientId: string; clientSecret: string; tokenKey: string };

class GoogleApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function googleCalendarConfig(env: GoogleCalendarEnv): GoogleConfig | null {
  if (!env.GOOGLE_CALENDAR_CLIENT_ID || !env.GOOGLE_CALENDAR_CLIENT_SECRET || !env.GOOGLE_CALENDAR_TOKEN_KEY) return null;
  return { clientId: env.GOOGLE_CALENDAR_CLIENT_ID, clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET, tokenKey: env.GOOGLE_CALENDAR_TOKEN_KEY };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function encryptionKey(encodedKey: string): Promise<CryptoKey> {
  const bytes = base64UrlToBytes(encodedKey);
  if (bytes.byteLength !== 32) throw new Error("GOOGLE_CALENDAR_TOKEN_KEY musi zawierać 32 bajty zakodowane jako base64url.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptGoogleToken(token: string, encodedKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(encodedKey), new TextEncoder().encode(token));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptGoogleToken(value: string, encodedKey: string): Promise<string> {
  const [encodedIv, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedCiphertext) throw new Error("Nieprawidłowo zapisane połączenie Google Calendar.");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(encodedIv) },
    await encryptionKey(encodedKey),
    base64UrlToBytes(encodedCiphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex");
}

export function googleEventIdForReservation(reservationId: string): string {
  return `st${reservationId.toLowerCase().replaceAll("-", "")}`;
}

export function googleEventToStoredEvent(event: GoogleEvent) {
  const startValue = event.start?.dateTime || event.start?.date;
  const endValue = event.end?.dateTime || event.end?.date;
  if (!event.id || !startValue || !endValue || event.status === "cancelled") return null;
  if (event.extendedProperties?.private?.showteamReservationId) return null;
  return {
    id: event.id,
    summary: event.summary?.trim() || "Wpis w kalendarzu Google",
    description: event.description?.trim() || null,
    location: event.location?.trim() || null,
    startValue,
    endValue,
    allDay: event.start?.date ? 1 : 0,
    htmlLink: event.htmlLink || null,
    updatedAt: event.updated || new Date().toISOString(),
  };
}

async function googleRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new GoogleApiError(response.status, await response.text());
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function accessToken(connection: GoogleCalendarConnection, config: GoogleConfig): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: await decryptGoogleToken(connection.encrypted_refresh_token, config.tokenKey),
      grant_type: "refresh_token",
    }),
  });
  const body = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) throw new Error(body.error_description || "Google odrzucił zapisane połączenie.");
  return body.access_token;
}

function bookingEvent(booking: BookingRow) {
  const contact = [booking.phone, booking.email].filter(Boolean).join(" · ");
  const notes = booking.staff_notes || booking.customer_notes;
  return {
    id: googleEventIdForReservation(booking.reservation_id),
    summary: `${booking.equipment_name} · ${booking.customer_name}`,
    description: [`Rezerwacja ${booking.reference}`, contact, notes].filter(Boolean).join("\n"),
    start: { dateTime: `${booking.booking_date}T${booking.start_time}:00`, timeZone: "Europe/Warsaw" },
    end: { dateTime: `${booking.booking_date}T${booking.end_time}:00`, timeZone: "Europe/Warsaw" },
    extendedProperties: { private: { showteamReservationId: booking.reservation_id, showteamReference: booking.reference } },
  };
}

async function pushBookings(database: D1Database, connection: GoogleCalendarConnection, token: string): Promise<void> {
  const rows = await database.prepare(`SELECT bookings.reservation_id, bookings.reference, equipment.name AS equipment_name,
      bookings.booking_date, bookings.start_time, bookings.end_time, bookings.customer_name, bookings.phone, bookings.email,
      bookings.customer_notes, bookings.staff_notes, bookings.status, bookings.updated_at,
      google_calendar_bookings.google_event_id AS mapped_event_id, google_calendar_bookings.booking_updated_at AS mapped_updated_at
    FROM bookings JOIN equipment ON equipment.id = bookings.equipment_id
    LEFT JOIN google_calendar_bookings ON google_calendar_bookings.reservation_id = bookings.reservation_id
    WHERE bookings.booking_date >= date('now', '-30 days') OR google_calendar_bookings.reservation_id IS NOT NULL`)
    .all<BookingRow>();
  const calendar = encodeURIComponent(connection.calendar_id);
  for (const booking of rows.results) {
    if (booking.status === "cancelled") {
      if (booking.mapped_event_id) {
        try { await googleRequest(token, `/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(booking.mapped_event_id)}`, { method: "DELETE" }); }
        catch (error) { if (!(error instanceof GoogleApiError) || ![404, 410].includes(error.status)) throw error; }
        await database.prepare("DELETE FROM google_calendar_bookings WHERE reservation_id = ?").bind(booking.reservation_id).run();
      }
      continue;
    }
    if (booking.mapped_updated_at === booking.updated_at) continue;
    const event = bookingEvent(booking);
    if (booking.mapped_event_id) {
      await googleRequest(token, `/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(booking.mapped_event_id)}`, { method: "PUT", body: JSON.stringify(event) });
    } else {
      try {
        await googleRequest(token, `/calendar/v3/calendars/${calendar}/events`, { method: "POST", body: JSON.stringify(event) });
      } catch (error) {
        if (!(error instanceof GoogleApiError) || error.status !== 409) throw error;
        await googleRequest(token, `/calendar/v3/calendars/${calendar}/events/${event.id}`, { method: "PUT", body: JSON.stringify(event) });
      }
    }
    await database.prepare(`INSERT INTO google_calendar_bookings (reservation_id, google_event_id, booking_updated_at) VALUES (?, ?, ?)
      ON CONFLICT(reservation_id) DO UPDATE SET google_event_id = excluded.google_event_id, booking_updated_at = excluded.booking_updated_at`)
      .bind(booking.reservation_id, event.id, booking.updated_at).run();
  }

  const removed = await database.prepare(`SELECT google_calendar_bookings.reservation_id, google_calendar_bookings.google_event_id
    FROM google_calendar_bookings LEFT JOIN bookings ON bookings.reservation_id = google_calendar_bookings.reservation_id
    WHERE bookings.reservation_id IS NULL`).all<{ reservation_id: string; google_event_id: string }>();
  for (const mapping of removed.results) {
    try { await googleRequest(token, `/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(mapping.google_event_id)}`, { method: "DELETE" }); }
    catch (error) { if (!(error instanceof GoogleApiError) || ![404, 410].includes(error.status)) throw error; }
    await database.prepare("DELETE FROM google_calendar_bookings WHERE reservation_id = ?").bind(mapping.reservation_id).run();
  }
}

async function pullGoogleEvents(database: D1Database, connection: GoogleCalendarConnection, token: string, allowReset = true): Promise<void> {
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  const calendar = encodeURIComponent(connection.calendar_id);
  if (!connection.sync_token) await database.prepare("DELETE FROM google_calendar_events").run();
  do {
    const query = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "2500" });
    if (connection.sync_token) query.set("syncToken", connection.sync_token);
    else query.set("timeMin", new Date(Date.now() - 30 * 86_400_000).toISOString());
    if (pageToken) query.set("pageToken", pageToken);
    let response: { items?: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string };
    try {
      response = await googleRequest(token, `/calendar/v3/calendars/${calendar}/events?${query}`);
    } catch (error) {
      if (allowReset && error instanceof GoogleApiError && error.status === 410) {
        await database.batch([
          database.prepare("DELETE FROM google_calendar_events"),
          database.prepare("UPDATE google_calendar_connections SET sync_token = NULL WHERE id = 'primary'"),
        ]);
        return pullGoogleEvents(database, { ...connection, sync_token: null }, token, false);
      }
      throw error;
    }
    for (const event of response.items || []) {
      if (!event.id) continue;
      const stored = googleEventToStoredEvent(event);
      if (!stored) {
        await database.prepare("DELETE FROM google_calendar_events WHERE id = ?").bind(event.id).run();
        continue;
      }
      await database.prepare(`INSERT INTO google_calendar_events (id, summary, description, location, start_value, end_value, all_day, html_link, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET summary = excluded.summary, description = excluded.description,
        location = excluded.location, start_value = excluded.start_value, end_value = excluded.end_value, all_day = excluded.all_day,
        html_link = excluded.html_link, updated_at = excluded.updated_at`)
        .bind(stored.id, stored.summary, stored.description, stored.location, stored.startValue, stored.endValue, stored.allDay, stored.htmlLink, stored.updatedAt).run();
    }
    pageToken = response.nextPageToken;
    nextSyncToken = response.nextSyncToken || nextSyncToken;
  } while (pageToken);
  await database.prepare("UPDATE google_calendar_connections SET sync_token = ?, last_synced_at = ?, updated_at = ? WHERE id = 'primary'")
    .bind(nextSyncToken || connection.sync_token, Date.now(), Date.now()).run();
}

export async function getGoogleCalendarConnection(database: D1Database): Promise<GoogleCalendarConnection | null> {
  return database.prepare(`SELECT calendar_id, calendar_name, account_email, encrypted_refresh_token, sync_token, last_synced_at
    FROM google_calendar_connections WHERE id = 'primary'`).first<GoogleCalendarConnection>();
}

export async function syncGoogleCalendar(database: D1Database, env: GoogleCalendarEnv, force = false): Promise<"synced" | "not-connected" | "busy" | "recent"> {
  const config = googleCalendarConfig(env);
  if (!config) return "not-connected";
  const connection = await getGoogleCalendarConnection(database);
  if (!connection) return "not-connected";
  if (!force && connection.last_synced_at && Date.now() - connection.last_synced_at < 25_000) return "recent";
  const now = Date.now();
  const lock = await database.prepare(`UPDATE google_calendar_connections SET sync_started_at = ? WHERE id = 'primary'
    AND (sync_started_at IS NULL OR sync_started_at < ?)`).bind(now, now - 120_000).run();
  if (!lock.meta.changes) return "busy";
  try {
    const token = await accessToken(connection, config);
    await pushBookings(database, connection, token);
    await pullGoogleEvents(database, connection, token);
    return "synced";
  } finally {
    await database.prepare("UPDATE google_calendar_connections SET sync_started_at = NULL WHERE id = 'primary'").run();
  }
}
