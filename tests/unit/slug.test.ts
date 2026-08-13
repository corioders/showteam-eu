import { describe, expect, it } from "vitest";
import { slugFromName } from "../../lib/slug";

describe("equipment identifier", () => {
  it("is generated from the single human-readable name", () => {
    expect(slugFromName("Łódź żaglowa 2-osobowa")).toBe("lodz-zaglowa-2-osobowa");
    expect(slugFromName("  SUP / XXL  ")).toBe("sup-xxl");
  });
});
