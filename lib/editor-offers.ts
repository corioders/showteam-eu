import type { OfferCategory } from "@/lib/offers";

export type EditableOffer = {
  title: string;
  category: OfferCategory;
  location: string;
  summary: string;
  season: string;
  dates: string[];
  highlights: string[];
  published: boolean;
};

const categories: OfferCategory[] = ["Lato", "Zima", "Szkolenia", "Noclegi"];

export function parseEditableOffer(input: unknown): { data?: EditableOffer; errors?: string[] } {
  if (!input || typeof input !== "object") return { errors: ["Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie."] };
  const value = input as Record<string, unknown>;
  const title = text(value.title);
  const category = categories.includes(value.category as OfferCategory) ? value.category as OfferCategory : null;
  const location = text(value.location);
  const summary = text(value.summary);
  const season = text(value.season);
  const dates = textList(value.dates, 30);
  const highlights = textList(value.highlights, 12);
  const errors: string[] = [];

  if (title.length < 2 || title.length > 120) errors.push("Nazwa oferty musi mieć od 2 do 120 znaków.");
  if (!category) errors.push("Wybierz kategorię oferty.");
  if (location.length < 2 || location.length > 160) errors.push("Wpisz lokalizację oferty.");
  if (summary.length < 10 || summary.length > 360) errors.push("Krótki opis musi mieć od 10 do 360 znaków.");
  if (season.length < 2 || season.length > 80) errors.push("Wpisz nazwę sezonu.");
  if (dates === null) errors.push("Możesz dodać najwyżej 30 terminów po 120 znaków.");
  if (highlights === null) errors.push("Możesz dodać najwyżej 12 punktów po 180 znaków.");
  if (errors.length || !category || !dates || !highlights) return { errors };

  return { data: { title, category, location, summary, season, dates, highlights, published: value.published !== false } };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown, limit: number) {
  if (!Array.isArray(value) || value.length > limit) return null;
  const result = value.map(text).filter(Boolean);
  return result.some((entry) => entry.length > 180) ? null : result;
}
