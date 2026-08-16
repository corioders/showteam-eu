import { getPayload } from "payload";
import config from "@payload-config";
import { offers as fallbackOffers, type Offer } from "@/lib/offers";
import { isIsoDate, type OfferDate } from "@/lib/offer-dates";

const staticImages = {
  lake: "/media/summer-wake-hero.jpg",
  snow: "/media/showteam-winter-fire.jpg",
  training: "/media/summer-sailing-drone.jpg",
  stay: "/media/base-life.jpg",
} as const;

function toOffer(document: Record<string, unknown>): Offer {
  const slug = String(document.slug);
  const cover = document.cover as { url?: string; alt?: string } | number | null | undefined;
  const dates = (document.dates as { label?: string; startDate?: string; endDate?: string }[] | undefined)?.flatMap((entry) => {
    const startDate = entry.startDate?.slice(0, 10) ?? "";
    const endDate = entry.endDate?.slice(0, 10) ?? "";
    return entry.label && isIsoDate(startDate) && isIsoDate(endDate) ? [{ label: entry.label, startDate, endDate } satisfies OfferDate] : [];
  }) ?? [];
  const highlights = (document.highlights as { text?: string }[] | undefined)?.flatMap((entry) => entry.text ? [entry.text] : []) ?? [];
  const sections = (document.sections as { title?: string; body?: string }[] | undefined)?.flatMap((section) => section.title && section.body ? [{ title: section.title, body: section.body }] : []) ?? [];
  const category = document.category as Offer["category"];
  const archivedOffer = fallbackOffers.find((offer) => offer.href === `/oferta/${slug}`);

  return {
    cmsId: String(document.id),
    category,
    title: String(document.title),
    location: String(document.location),
    season: String(document.season),
    dates,
    summary: String(document.summary),
    highlights: highlights.length ? highlights : archivedOffer?.highlights ?? [],
    image: typeof cover === "object" && cover?.url ? cover.url : staticImages[(document.staticImage as keyof typeof staticImages) ?? "lake"],
    imageAlt: typeof cover === "object" && cover?.alt ? cover.alt : `${category} z SHOWteam`,
    href: `/oferta/${slug}`,
    contactHref: `mailto:biuro@showteam.eu?subject=${encodeURIComponent(String(document.title))}`,
    slug,
    mapUrl: String(document.mapUrl || archivedOffer?.mapUrl || ""),
    ctaTitle: String(document.ctaTitle || archivedOffer?.ctaTitle || "Zapytaj o szczegóły"),
    sortOrder: Number(document.sortOrder ?? archivedOffer?.sortOrder ?? 10),
    published: document.published !== false,
    sections,
  };
}

export async function getOffers(): Promise<Offer[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({ collection: "offers", where: { published: { equals: true } }, sort: "sortOrder", depth: 1, limit: 10 });
    return result.docs.length ? result.docs.map((document) => toOffer(document as unknown as Record<string, unknown>)) : fallbackOffers;
  } catch {
    return fallbackOffers;
  }
}

export async function getOffer(slug: string) {
  const cmsOffers = await getOffers();
  return cmsOffers.find((offer) => offer.href === `/oferta/${slug}`) ?? fallbackOffers.find((offer) => offer.href === `/oferta/${slug}`);
}

export async function getOfferByCategory(category: Offer["category"]) {
  const cmsOffers = await getOffers();
  return cmsOffers.find((offer) => offer.category === category) ?? fallbackOffers.find((offer) => offer.category === category);
}
