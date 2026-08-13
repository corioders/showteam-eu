import { describe, expect, it } from "vitest";
import { bookingReference, createTimeSlots, endTime, isBookingDate, normalizePhone, timeToMinutes } from "../../lib/reservations";

describe("reservation rules", () => {
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
    expect(normalizePhone("+48 (500) 128-090")).toBe("+48500128090");
    expect(normalizePhone("123")).toBeNull();
  });

  it("builds a short non-sensitive confirmation reference", () => {
    expect(bookingReference("12345678-abcd-4000-9000-123456789abc")).toBe("SHOW-12345678");
  });
});
