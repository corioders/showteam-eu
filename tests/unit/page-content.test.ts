import { describe, expect, it } from "vitest";
import { pageContentDefaults, parsePageContent } from "../../lib/page-content-schema";

describe("page content", () => {
  it("accepts a complete page update", () => {
    const result = parsePageContent("home", pageContentDefaults.home);
    expect(result.errors).toBeUndefined();
    expect(result.data?.heroTitleTop).toBe("Zrób");
  });

  it("rejects missing fields without discarding the valid input", () => {
    const result = parsePageContent("contact", { ...pageContentDefaults.contact, title: "" });
    expect(result.data).toBeUndefined();
    expect(result.errors).toContain("Pole „title” nie może być puste.");
  });

  it("rejects links that could execute script", () => {
    const result = parsePageContent("contact", { ...pageContentDefaults.contact, mapUrl: "javascript:alert(1)" });
    expect(result.data).toBeUndefined();
    expect(result.errors).toContain("Link musi zaczynać się od https:// lub http://.");
  });

  it("validates content added to every public workflow page", () => {
    expect(parsePageContent("stays", pageContentDefaults.stays).data?.heroImageUrl).toBe("/media/base-life.jpg");
    expect(parsePageContent("application", pageContentDefaults.application).data?.titleAccent).toBe("z nami?");
    expect(parsePageContent("eventInquiry", pageContentDefaults.eventInquiry).data?.heroImageUrl).toBe("/media/summer-wake-aerial.jpg");
  });
});
