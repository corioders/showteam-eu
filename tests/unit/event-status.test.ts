import { describe, expect, it } from "vitest";
import { eventStatus, groupEvents } from "../../lib/event-status";
import type { PublicEvent } from "../../lib/events";

const event = (id: string, startDate: string, endDate?: string) => ({ id, startDate, endDate }) as PublicEvent;

describe("event date classification", () => {
  const today = new Date("2026-08-13T12:00:00+02:00");

  it("classifies events automatically using Warsaw calendar dates", () => {
    expect(eventStatus(event("next", "2026-08-14T00:00:00+02:00"), today)).toBe("upcoming");
    expect(eventStatus(event("today", "2026-08-13T00:00:00+02:00"), today)).toBe("ongoing");
    expect(eventStatus(event("camp", "2026-08-10T00:00:00+02:00", "2026-08-13T23:59:00+02:00"), today)).toBe("ongoing");
    expect(eventStatus(event("old", "2026-08-12T00:00:00+02:00"), today)).toBe("past");
  });

  it("shows nearest upcoming first and newest past first", () => {
    const groups = groupEvents([
      event("oldest", "2026-07-01T00:00:00+02:00"),
      event("later", "2026-09-01T00:00:00+02:00"),
      event("recent", "2026-08-12T00:00:00+02:00"),
      event("next", "2026-08-14T00:00:00+02:00"),
    ], today);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["next", "later"]);
    expect(groups.past.map(({ id }) => id)).toEqual(["recent", "oldest"]);
  });
});
