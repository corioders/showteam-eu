import { describe, expect, it } from "vitest";

import { eventInquiryReference, eventInquiryStatusLabels } from "../../src/lib/event-inquiries";

describe("event inquiries", () => {
	it("creates a short readable reference", () => {
		expect(eventInquiryReference("12345678-aaaa-bbbb-cccc-123456789012")).toBe("IMP-12345678");
	});

	it("has a plain Polish label for every workflow state", () => {
		expect(Object.keys(eventInquiryStatusLabels)).toEqual(["new", "callback", "contacted", "offer_sent", "confirmed", "cancelled"]);
	});
});
