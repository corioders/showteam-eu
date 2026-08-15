import type { Offer, OfferCategory } from "@/lib/offers";
import { isIsoDate, type OfferDate } from "./offer-dates";

export type OfferDraft = {
  title: string;
  category: OfferCategory;
  location: string;
  summary: string;
  season: string;
  dates: OfferDate[];
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
      dates: dates(parsed.dates, fallback.dates),
      highlights: textList(parsed.highlights, fallback.highlights),
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

function dates(value: unknown, fallback: OfferDate[]) {
  if (!Array.isArray(value)) return fallback;
  const restored = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label : "";
    const startDate = typeof row.startDate === "string" ? row.startDate.slice(0, 10) : "";
    const endDate = typeof row.endDate === "string" ? row.endDate.slice(0, 10) : "";
    return label && isIsoDate(startDate) && isIsoDate(endDate) ? [{ label, startDate, endDate }] : [];
  });
  return restored.length === value.length ? restored : fallback;
}

function textList(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return fallback;
}
