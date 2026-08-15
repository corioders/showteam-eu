import { describe, expect, it } from "vitest";
import { formatOfferDateRange, isIsoDate } from "../../lib/offer-dates";

describe("structured offer dates", () => {
  it("formats exact ranges in Polish", () => {
    expect(formatOfferDateRange({ label: "Turnus", startDate: "2026-07-12", endDate: "2026-07-24" })).toBe("12–24 lipca 2026");
    expect(formatOfferDateRange({ label: "Sylwester", startDate: "2025-12-27", endDate: "2026-01-02" })).toBe("27 grudnia 2025 – 2 stycznia 2026");
  });

  it("rejects impossible calendar dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-03-01")).toBe(true);
  });
});
