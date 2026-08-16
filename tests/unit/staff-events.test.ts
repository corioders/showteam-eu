import { describe, expect, it } from "vitest";
import { staffEventBlocksRange, staffEventInstances, type StaffEventRecord } from "../../lib/staff-events";

const event: StaffEventRecord = {
  id: "event", title: "Zamknięcie", startDate: "2027-05-08", endDate: null,
  startTime: null, endTime: null, allDay: true, blocksBase: true, notes: null,
  recurrence: "none", recurrenceUntil: null,
};

describe("staff calendar events", () => {
  it("blocks a whole day without exposing a reason", () => {
    expect(staffEventBlocksRange(event, "2027-05-08", "10:00", "11:00")).toBe(true);
    expect(staffEventBlocksRange(event, "2027-05-09", "10:00", "11:00")).toBe(false);
  });

  it("blocks only overlapping hours for timed events", () => {
    const timed = { ...event, allDay: false, startTime: "15:00", endTime: "17:00" };
    expect(staffEventBlocksRange(timed, "2027-05-08", "14:00", "15:00")).toBe(false);
    expect(staffEventBlocksRange(timed, "2027-05-08", "16:00", "17:00")).toBe(true);
  });

  it("expands weekly events only until the selected date", () => {
    const recurring = { ...event, recurrence: "weekly" as const, recurrenceUntil: "2027-05-29" };
    expect(staffEventInstances(recurring, "2027-05-01", "2027-06-01").map((item) => item.occurrenceStartDate)).toEqual([
      "2027-05-08", "2027-05-15", "2027-05-22", "2027-05-29",
    ]);
  });

  it("keeps informational events visible without blocking reservations", () => {
    expect(staffEventBlocksRange({ ...event, blocksBase: false }, "2027-05-08", "10:00", "11:00")).toBe(false);
  });
});
