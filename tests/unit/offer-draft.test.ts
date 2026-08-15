import { describe, expect, it } from "vitest";
import { restoreOfferDraft, type OfferDraft } from "../../lib/offer-draft";

const fallback: OfferDraft = { title: "SHOWzima", category: "Zima", location: "Dolomity", summary: "Opis oferty zimowej", season: "2026", dates: [], highlights: [], published: true };

describe("offer draft restoration", () => {
  it("migrates lists saved by the previous textarea editor", () => {
    const restored = restoreOfferDraft(JSON.stringify({ ...fallback, dates: "1–7 stycznia\n8–14 stycznia", highlights: "Narty\nHotel" }), fallback);

    expect(restored?.dates).toEqual(["1–7 stycznia", "8–14 stycznia"]);
    expect(restored?.highlights).toEqual(["Narty", "Hotel"]);
  });
});
