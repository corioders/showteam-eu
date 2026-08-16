import { describe, expect, it } from "vitest";
import { restoreOfferDraft, type OfferDraft } from "../../lib/offer-draft";

const fallback: OfferDraft = { title: "SHOWzima", category: "Zima", location: "Dolomity", summary: "Opis oferty zimowej", season: "2026", dates: [{ label: "Turnus I", startDate: "2026-01-03", endDate: "2026-01-10" }], highlights: [], sections: [], slug: "zima", mapUrl: "https://maps.google.com/", ctaTitle: "Jedziesz?", sortOrder: 20, published: true };

describe("offer draft restoration", () => {
  it("drops ambiguous legacy dates but preserves the other saved fields", () => {
    const restored = restoreOfferDraft(JSON.stringify({ ...fallback, dates: "1–7 stycznia\n8–14 stycznia", highlights: "Narty\nHotel" }), fallback);

    expect(restored?.dates).toEqual(fallback.dates);
    expect(restored?.highlights).toEqual(["Narty", "Hotel"]);
  });
});
