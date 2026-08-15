import type { DesktopGalleryLayout, MobileGalleryLayout } from "./gallery-layout";

export type EditableGalleryItem = {
  caption: string;
  alt: string;
  season: "Lato" | "Zima" | "Szkolenia";
  published: boolean;
  layout: DesktopGalleryLayout;
  mobileLayout: MobileGalleryLayout;
  fit: "cover" | "contain";
  mobilePosition: "same" | "50% 20%" | "50% 50%" | "50% 80%" | "20% 50%" | "80% 50%";
  sourceUrl: string;
  focalX: number;
  focalY: number;
};

const seasons = ["Lato", "Zima", "Szkolenia"] as const;
const layouts: DesktopGalleryLayout[] = ["large", "wide", "tall", "square"];
const mobileLayouts: MobileGalleryLayout[] = ["landscape", "portrait", "square"];
const positions: EditableGalleryItem["mobilePosition"][] = ["same", "50% 20%", "50% 50%", "50% 80%", "20% 50%", "80% 50%"];

export function parseEditableGalleryItem(input: unknown): { data?: EditableGalleryItem; errors?: string[] } {
  if (!input || typeof input !== "object") return { errors: ["Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie."] };
  const value = input as Record<string, unknown>;
  const caption = text(value.caption);
  const alt = text(value.alt);
  const season = seasons.includes(value.season as typeof seasons[number]) ? value.season as typeof seasons[number] : null;
  const layout = layouts.includes(value.layout as DesktopGalleryLayout) ? value.layout as DesktopGalleryLayout : null;
  const mobileLayout = mobileLayouts.includes(value.mobileLayout as MobileGalleryLayout) ? value.mobileLayout as MobileGalleryLayout : null;
  const fit = value.fit === "cover" || value.fit === "contain" ? value.fit : null;
  const mobilePosition = positions.includes(value.mobilePosition as EditableGalleryItem["mobilePosition"]) ? value.mobilePosition as EditableGalleryItem["mobilePosition"] : null;
  const sourceUrl = text(value.sourceUrl);
  const focalX = coordinate(value.focalX);
  const focalY = coordinate(value.focalY);
  const errors: string[] = [];
  if (caption.length < 2 || caption.length > 100) errors.push("Podpis musi mieć od 2 do 100 znaków.");
  if (alt.length > 180) errors.push("Opis zdjęcia może mieć najwyżej 180 znaków.");
  if (!season) errors.push("Wybierz kategorię materiału.");
  if (!layout || !mobileLayout || !fit || !mobilePosition) errors.push("Wybierz sposób wyświetlania materiału.");
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) errors.push("Link źródłowy musi zaczynać się od https://.");
  if (focalX === null || focalY === null) errors.push("Ustaw najważniejszy punkt zdjęcia między 0 a 100.");
  if (errors.length || !season || !layout || !mobileLayout || !fit || !mobilePosition || focalX === null || focalY === null) return { errors };
  return { data: { caption, alt, season, published: value.published !== false, layout, mobileLayout, fit, mobilePosition, sourceUrl, focalX, focalY } };
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function coordinate(value: unknown) { const result = Number(value); return Number.isFinite(result) && result >= 0 && result <= 100 ? Math.round(result) : null; }
