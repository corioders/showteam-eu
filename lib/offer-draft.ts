import type { Offer, OfferCategory } from "@/lib/offers";

export type OfferDraft = {
  title: string;
  category: OfferCategory;
  location: string;
  summary: string;
  season: string;
  dates: string[];
  highlights: string[];
  published: boolean;
};

export function toOfferDraft(offer: Offer): OfferDraft {
  return { title: offer.title, category: offer.category, location: offer.location, summary: offer.summary, season: offer.season, dates: offer.dates, highlights: offer.highlights, published: true };
}

export function restoreOfferDraft(saved: string, fallback: OfferDraft): OfferDraft | null {
  try {
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: text(parsed.title, fallback.title),
      category: category(parsed.category, fallback.category),
      location: text(parsed.location, fallback.location),
      summary: text(parsed.summary, fallback.summary),
      season: text(parsed.season, fallback.season),
      dates: list(parsed.dates, fallback.dates),
      highlights: list(parsed.highlights, fallback.highlights),
      published: typeof parsed.published === "boolean" ? parsed.published : fallback.published,
    };
  } catch {
    return null;
  }
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function category(value: unknown, fallback: OfferCategory) {
  return value === "Lato" || value === "Zima" || value === "Szkolenia" || value === "Noclegi" ? value : fallback;
}

function list(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return fallback;
}
