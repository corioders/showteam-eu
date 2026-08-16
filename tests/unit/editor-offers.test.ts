import { describe, expect, it } from "vitest";
import { parseEditableOffer } from "../../lib/editor-offers";

describe("visual offer editor", () => {
  it("accepts and trims operator content", () => {
    expect(parseEditableOffer({
      title: " SHOWlato ", category: "Lato", location: " Poręba ", summary: " Wakacje pełne sportu i dobrej energii. ", season: " Sezon 2027 ", dates: [{ label: " Turnus I ", startDate: "2027-07-01", endDate: "2027-07-07" }], highlights: [" Wakeboard "], sections: [{ title: " Baza ", body: " Wszystko na miejscu. " }], slug: "showlato-2027", mapUrl: "https://maps.google.com/", ctaTitle: "Jedziesz z nami?", sortOrder: 10, pageContent: { intro: " Tekst " }, published: true,
    }).data).toEqual({ title: "SHOWlato", category: "Lato", location: "Poręba", summary: "Wakacje pełne sportu i dobrej energii.", season: "Sezon 2027", dates: [{ label: "Turnus I", startDate: "2027-07-01", endDate: "2027-07-07" }], highlights: ["Wakeboard"], sections: [{ title: "Baza", body: "Wszystko na miejscu." }], slug: "showlato-2027", mapUrl: "https://maps.google.com/", ctaTitle: "Jedziesz z nami?", sortOrder: 10, pageContent: { intro: "Tekst" }, published: true });
  });

  it("returns messages an operator can act on", () => {
    const result = parseEditableOffer({ title: "", category: "X", location: "", summary: "za krótko", season: "", dates: [], highlights: [] });
    expect(result.errors).toEqual(expect.arrayContaining(["Nazwa oferty musi mieć od 2 do 120 znaków.", "Wybierz kategorię oferty.", "Wpisz lokalizację oferty."]));
  });

  it("rejects an ambiguous or reversed term", () => {
    const result = parseEditableOffer({ title: "SHOWlato", category: "Lato", location: "Poręba", summary: "Wakacje pełne sportu i dobrej energii.", season: "Sezon 2027", dates: [{ label: "Turnus I", startDate: "2027-07-07", endDate: "2027-07-01" }], highlights: [], sections: [], slug: "showlato", mapUrl: "https://maps.google.com/", ctaTitle: "Jedziesz?", sortOrder: 10, pageContent: {} });

    expect(result.errors).toContain("Termin 1: zakończenie nie może być przed rozpoczęciem.");
  });
});
