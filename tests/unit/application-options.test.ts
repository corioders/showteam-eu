import { describe, expect, it } from "vitest";
import { applicationDateIsAvailable, getApplicationOfferGroups } from "../../lib/application-options";
import { offers } from "../../lib/offers";

describe("application offer choices", () => {
  it("hides date ranges that have already ended", () => {
    const summer = offers.find((offer) => offer.category === "Lato")!;
    expect(applicationDateIsAvailable("28.06–10.07", summer, "2026-08-14")).toBe(false);
    expect(applicationDateIsAvailable("15–21.08", summer, "2026-08-14")).toBe(true);
  });

  it("understands winter seasons that begin in the previous calendar year", () => {
    const winter = offers.find((offer) => offer.category === "Zima")!;
    expect(applicationDateIsAvailable("21–27.12", winter, "2026-01-01")).toBe(false);
    expect(applicationDateIsAvailable("21–27 grudnia · Boże Narodzenie", winter, "2026-01-01")).toBe(false);
    expect(applicationDateIsAvailable("28.02–7.03", winter, "2026-01-01")).toBe(true);
  });

  it("offers only participant categories and keeps descriptive dates", () => {
    const groups = getApplicationOfferGroups(offers, "2026-08-14");
    expect(groups.map((group) => group.category)).toEqual(["Lato", "Zima", "Szkolenia"]);
    expect(groups.find((group) => group.category === "Lato")?.offers[0].dates).toEqual(["9–15.08", "15–21.08"]);
    expect(groups.find((group) => group.category === "Zima")?.offers).toEqual([]);
    expect(groups.find((group) => group.category === "Szkolenia")?.offers[0].dates).toContain("Terminy indywidualne");
  });
});
