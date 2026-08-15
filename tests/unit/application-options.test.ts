import { describe, expect, it } from "vitest";
import { applicationDateIsAvailable, getApplicationOfferGroups } from "../../lib/application-options";
import { offers } from "../../lib/offers";

describe("application offer choices", () => {
  it("hides date ranges that have already ended", () => {
    const summer = offers.find((offer) => offer.category === "Lato")!;
    expect(applicationDateIsAvailable(summer.dates[0], "2026-08-14")).toBe(false);
    expect(applicationDateIsAvailable(summer.dates[4], "2026-08-14")).toBe(true);
  });

  it("uses exact winter dates across calendar years", () => {
    const winter = offers.find((offer) => offer.category === "Zima")!;
    expect(applicationDateIsAvailable(winter.dates[0], "2026-01-01")).toBe(false);
    expect(applicationDateIsAvailable(winter.dates[1], "2026-01-01")).toBe(true);
    expect(applicationDateIsAvailable(winter.dates[9], "2026-01-01")).toBe(true);
  });

  it("offers only participant categories and keeps descriptive dates", () => {
    const groups = getApplicationOfferGroups(offers, "2026-08-14");
    expect(groups.map((group) => group.category)).toEqual(["Lato", "Zima", "Szkolenia"]);
    expect(groups.find((group) => group.category === "Lato")?.offers[0].dates.map((date) => date.label)).toEqual(["Turnus IV", "Turnus V"]);
    expect(groups.find((group) => group.category === "Zima")?.offers).toEqual([]);
    expect(groups.find((group) => group.category === "Szkolenia")?.offers[0].dates).toEqual([]);
  });
});
