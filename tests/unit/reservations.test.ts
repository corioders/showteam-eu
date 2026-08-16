import { describe, expect, it } from "vitest";
import { addDaysToBookingDate, bookingDateChoices, bookingReference, createTimeSlots, endTime, isActivityOpenDate, isBaseOpenDate, isBookingDate, isUniqueConstraintError, normalizePhone, resolveBookingHours, timeRangesOverlap, timeToMinutes, todayInPoland, type AvailabilityHoursRule } from "../../lib/reservations";

describe("reservation rules", () => {
  it("builds date strips across month boundaries", () => {
    expect(addDaysToBookingDate("2026-08-30", 7)).toBe("2026-09-06");
    expect(bookingDateChoices("2026-12-29", 4)).toEqual(["2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01"]);
  });

  it("creates only complete fixed-duration slots", () => {
    expect(createTimeSlots("09:00", "12:30", 60)).toEqual(["09:00", "10:00", "11:00"]);
    expect(createTimeSlots("bad", "12:00", 60)).toEqual([]);
    expect(endTime("18:30", 60)).toBe("19:30");
    expect(timeToMinutes("24:00")).toBeNaN();
  });

  it("validates dates and normalizes Polish phone numbers", () => {
    expect(isBookingDate("2026-08-31")).toBe(true);
    expect(isBookingDate("2026-02-30")).toBe(false);
    expect(normalizePhone("500 128 090")).toBe("+48500128090");
    expect(normalizePhone("48 500 128 090")).toBe("+48500128090");
    expect(normalizePhone("+48 (500) 128-090")).toBe("+48500128090");
    expect(normalizePhone("123")).toBeNull();
  });

  it("opens the base from May through October and respects weekend bans", () => {
    expect(isBaseOpenDate("2027-05-01")).toBe(true);
    expect(isBaseOpenDate("2027-10-31")).toBe(true);
    expect(isBaseOpenDate("2027-11-01")).toBe(false);
    expect(isActivityOpenDate("2027-05-03", true)).toBe(true);
    expect(isActivityOpenDate("2027-05-08", true)).toBe(false);
    expect(isActivityOpenDate("2027-05-08", false)).toBe(true);
  });

  it("distinguishes a booked slot from a database outage", () => {
    expect(isUniqueConstraintError(new Error("UNIQUE constraint failed: booking_slots.equipment_id"))).toBe(true);
    expect(isUniqueConstraintError(new Error("D1_ERROR: network unavailable"))).toBe(false);
  });

  it("builds a short non-sensitive confirmation reference", () => {
    expect(bookingReference("12345678-abcd-4000-9000-123456789abc")).toBe("SHOW-12345678");
  });

  it("detects overlapping blocked time ranges", () => {
    expect(timeRangesOverlap("09:00", "10:00", "09:30", "11:00")).toBe(true);
    expect(timeRangesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });

  it("prefers date hours, then equipment templates, then defaults", () => {
    const rules: AvailabilityHoursRule[] = [
      { equipmentId: null, ruleType: "weekly", bookingDate: null, weekdays: "0,6", startTime: "10:00", endTime: "16:00", createdAt: 1 },
      { equipmentId: 7, ruleType: "weekly", bookingDate: null, weekdays: "6", startTime: "11:00", endTime: "15:00", createdAt: 2 },
      { equipmentId: null, ruleType: "date", bookingDate: "2026-08-29", weekdays: null, startTime: "08:00", endTime: "13:00", createdAt: 3 },
    ];
    expect(resolveBookingHours("09:00", "18:00", 7, "2026-08-29", rules)).toEqual({ openTime: "08:00", closeTime: "13:00" });
    expect(resolveBookingHours("09:00", "18:00", 7, "2026-09-05", rules)).toEqual({ openTime: "11:00", closeTime: "15:00" });
    expect(resolveBookingHours("09:00", "18:00", 7, "2026-09-07", rules)).toEqual({ openTime: "09:00", closeTime: "18:00" });
  });

  it("uses the Polish calendar date at UTC day boundaries", () => {
    expect(todayInPoland(new Date("2026-08-13T22:30:00Z"))).toBe("2026-08-14");
  });
});
