import { describe, expect, it } from "vitest";
import { buildCalendarFeed, type CalendarBlock, type CalendarBooking } from "../../lib/calendar-feed";

const booking: CalendarBooking = {
  reservation_id: "6421c5bd-2f91-462c-aed6-5b891df45aa2",
  reference: "SHOW-6421C5BD",
  equipment_name: "SUP, duży",
  booking_date: "2026-08-27",
  start_time: "09:00",
  end_time: "10:00",
  customer_name: "Asia; Test",
  phone: "+48500128090",
  status: "confirmed",
  customer_notes: "Proszę zadzwonić\nprzed przyjazdem",
  staff_notes: null,
  updated_at: "2026-08-13T18:14:21.000Z",
};

const block: CalendarBlock = {
  id: "3621c5bd-2f91-462c-aed6-5b891df45aa2",
  equipment_name: null,
  booking_date: "2026-08-28",
  start_time: "12:00",
  end_time: "14:00",
  reason: "Serwis; bazy",
  created_at: 1_776_296_400_000,
};

describe("calendar feed", () => {
  it("emits a subscribable Warsaw-time event and escapes customer text", () => {
    const feed = buildCalendarFeed([booking], new Date("2026-08-13T20:00:00Z"));
    expect(feed).toContain("BEGIN:VCALENDAR\r\n");
    expect(feed).toContain("DTSTART;TZID=Europe/Warsaw:20260827T090000");
    expect(feed).toContain("DTEND;TZID=Europe/Warsaw:20260827T100000");
    expect(feed).toContain("SUMMARY:SUP\\, duży - Asia\\; Test");
    expect(feed).toContain("Proszę zadzwonić\\nprzed przyjazdem");
    expect(feed).toContain("UID:6421c5bd-2f91-462c-aed6-5b891df45aa2@showteam.eu");
    expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("folds long lines to at most 75 UTF-8 bytes", () => {
    const feed = buildCalendarFeed([{ ...booking, customer_notes: "ą".repeat(100) }]);
    for (const line of feed.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("includes availability blocks in subscribed calendars", () => {
    const feed = buildCalendarFeed([], new Date("2026-08-13T20:00:00Z"), [block]);
    expect(feed).toContain("DTSTART;TZID=Europe/Warsaw:20260828T120000");
    expect(feed).toContain("SUMMARY:BLOKADA - Wszystkie sprzęty");
    expect(feed).toContain("DESCRIPTION:Serwis\\; bazy");
  });
});
