import { describe, expect, it } from "vitest";
import { parseEditableGalleryItem } from "../../lib/editor-gallery";

const valid = { caption: "SHOWCamp", alt: "Wakeboard na jeziorze", season: "Lato", published: true, layout: "wide", mobileLayout: "landscape", fit: "cover", mobilePosition: "same", sourceUrl: "https://www.instagram.com/showteam.eu/", focalX: 42, focalY: 61, sortOrder: 100 };

describe("visual gallery editor", () => {
  it("accepts gallery display settings and focal point", () => {
    expect(parseEditableGalleryItem(valid).data).toMatchObject({ caption: "SHOWCamp", layout: "wide", focalX: 42, focalY: 61 });
  });

  it("rejects broken links and crop values", () => {
    const result = parseEditableGalleryItem({ ...valid, sourceUrl: "instagram", focalX: 120 });
    expect(result.errors).toEqual(expect.arrayContaining(["Link źródłowy musi zaczynać się od https://.", "Ustaw najważniejszy punkt zdjęcia między 0 a 100."]));
  });
});
