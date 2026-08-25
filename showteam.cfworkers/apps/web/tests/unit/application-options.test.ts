import { describe, expect, it } from "vitest";

import { applicationDateIsAvailable, getApplicationOfferGroups } from "../../src/lib/application-options";
import { offers } from "../../src/lib/offers";

describe("application offer choices", () => {
	it("hides date ranges that have already ended", () => {
		expect(applicationDateIsAvailable({ label: "Stary", startDate: "2026-08-01", endDate: "2026-08-10" }, "2026-08-14")).toBe(false);
		expect(applicationDateIsAvailable({ label: "Trwa", startDate: "2026-08-01", endDate: "2026-08-14" }, "2026-08-14")).toBe(true);
	});

	it("uses the confirmed Pireneje date", () => {
		const winter = offers.find((offer) => offer.category === "Zima")!;
		expect(winter.dates).toEqual([{ label: "Pireneje", startDate: "2027-03-14", endDate: "2027-03-25" }]);
		expect(applicationDateIsAvailable(winter.dates[0], "2027-03-25")).toBe(true);
		expect(applicationDateIsAvailable(winter.dates[0], "2027-03-26")).toBe(false);
	});

	it("offers only participant categories and keeps descriptive dates", () => {
		const groups = getApplicationOfferGroups(offers, "2026-08-14");
		expect(groups.map((group) => group.category)).toEqual(["Lato", "Zima", "Szkolenia"]);
		expect(groups.find((group) => group.category === "Lato")?.offers[0].dates).toEqual([]);
		expect(groups.find((group) => group.category === "Zima")?.offers[0].dates.map((date) => date.label)).toEqual(["Pireneje"]);
		expect(groups.find((group) => group.category === "Szkolenia")?.offers[0].dates).toEqual([]);
	});
});
