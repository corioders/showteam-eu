import { describe, expect, it } from "vitest";
import { parseEditableOffer } from "../../lib/editor-offers";

describe("visual offer editor", () => {
  it("accepts and trims operator content", () => {
    expect(parseEditableOffer({
      title: " SHOWlato ", category: "Lato", location: " Poręba ", summary: " Wakacje pełne sportu i dobrej energii. ", season: " Sezon 2027 ", dates: [" 1–7 lipca ", ""], highlights: [" Wakeboard "], published: true,
    }).data).toEqual({ title: "SHOWlato", category: "Lato", location: "Poręba", summary: "Wakacje pełne sportu i dobrej energii.", season: "Sezon 2027", dates: ["1–7 lipca"], highlights: ["Wakeboard"], published: true });
  });

  it("returns messages an operator can act on", () => {
    const result = parseEditableOffer({ title: "", category: "X", location: "", summary: "za krótko", season: "", dates: [], highlights: [] });
    expect(result.errors).toEqual(expect.arrayContaining(["Nazwa oferty musi mieć od 2 do 120 znaków.", "Wybierz kategorię oferty.", "Wpisz lokalizację oferty."]));
  });
});
