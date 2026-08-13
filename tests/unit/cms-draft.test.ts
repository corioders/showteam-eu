import { describe, expect, it } from "vitest";
import { cmsDraftData, cmsDraftKey, parseCmsDraft } from "../../lib/cms-draft";

describe("CMS form drafts", () => {
  it("keeps valid local drafts per document", () => {
    const now = Date.UTC(2026, 7, 13);
    const raw = JSON.stringify({ version: 1, savedAt: now - 1_000, data: { title: "SHOWCamp" } });

    expect(cmsDraftKey("events", 12)).toBe("showteam:cms-draft:events:12");
    expect(cmsDraftKey("events")).toBe("showteam:cms-draft:events:new");
    expect(parseCmsDraft(raw, now)?.data).toEqual({ title: "SHOWCamp" });
  });

  it("rejects broken and expired browser data", () => {
    const now = Date.UTC(2026, 7, 13);
    const expired = JSON.stringify({ version: 1, savedAt: now - 8 * 24 * 60 * 60 * 1000, data: { title: "Stare" } });

    expect(parseCmsDraft(expired, now)).toBeNull();
    expect(parseCmsDraft("not-json", now)).toBeNull();
  });

  it("does not keep customer details from reservation forms", () => {
    expect(cmsDraftData("bookings", {
      customerName: "Klient",
      phone: "+48500000000",
      staffNotes: "Oddzwonić",
      status: "confirmed",
    })).toEqual({ staffNotes: "Oddzwonić", status: "confirmed" });
  });
});
