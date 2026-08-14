import { describe, expect, it } from "vitest";
import { decryptGoogleToken, encryptGoogleToken, googleEventIdForReservation, googleEventToStoredEvent } from "../../lib/google-calendar";

describe("Google Calendar synchronization", () => {
  it("encrypts refresh tokens before storing them", async () => {
    const key = Buffer.alloc(32, 7).toString("base64url");
    const encrypted = await encryptGoogleToken("secret-refresh-token", key);
    expect(encrypted).not.toContain("secret-refresh-token");
    expect(await decryptGoogleToken(encrypted, key)).toBe("secret-refresh-token");
  });

  it("uses a stable Google-compatible event id for a reservation", () => {
    expect(googleEventIdForReservation("6421c5bd-2f91-462c-aed6-5b891df45aa2")).toBe("st6421c5bd2f91462caed65b891df45aa2");
  });

  it("imports manual events but not reservations created by SHOWteam", () => {
    expect(googleEventToStoredEvent({ id: "manual", summary: "Przyjazd grupy", start: { date: "2026-08-22" }, end: { date: "2026-08-23" } })).toMatchObject({ summary: "Przyjazd grupy", allDay: 1 });
    expect(googleEventToStoredEvent({ id: "booking", start: { dateTime: "2026-08-22T10:00:00+02:00" }, end: { dateTime: "2026-08-22T11:00:00+02:00" }, extendedProperties: { private: { showteamReservationId: "id" } } })).toBeNull();
    expect(googleEventToStoredEvent({ id: "deleted", status: "cancelled", start: { date: "2026-08-22" }, end: { date: "2026-08-23" } })).toBeNull();
  });
});
