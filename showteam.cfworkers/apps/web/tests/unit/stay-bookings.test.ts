import { describe, expect, it } from "vitest";

import { stayBookingReference, stayBookingStatusLabels } from "../../src/lib/stay-bookings";

describe("stay bookings", () => {
	it("creates a short readable reference", () => {
		expect(stayBookingReference("12345678-aaaa-bbbb-cccc-123456789012")).toBe("NOC-12345678");
	});

	it("exposes every operator status in Polish", () => {
		expect(Object.keys(stayBookingStatusLabels)).toEqual(["pending", "confirmed", "completed", "cancelled"]);
	});
});
