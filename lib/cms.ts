import { getPayload } from "payload";
import config from "@payload-config";
import { offers as fallbackOffers, type Offer } from "@/lib/offers";

const staticImages = {
  lake: "/media/summer-wake-hero.jpg",
  snow: "/media/showteam-winter-fire.jpg",
  training: "/media/summer-sailing-drone.jpg",
  stay: "/media/base-life.jpg",
} as const;

function toOffer(document: Record<string, unknown>): Offer {
  const slug = String(document.slug);
  const cover = document.cover as { url?: string; alt?: string } | number | null | undefined;
  const dates = (document.dates as { date?: string }[] | undefined)?.flatMap((entry) => entry.date ? [entry.date] : []) ?? [];
  const highlights = (document.highlights as { text?: string }[] | undefined)?.flatMap((entry) => entry.text ? [entry.text] : []) ?? [];
  const sections = (document.sections as { title?: string; body?: string }[] | undefined)?.flatMap((section) => section.title && section.body ? [{ title: section.title, body: section.body }] : []) ?? [];
  const category = document.category as Offer["category"];

  return {
    cmsId: String(document.id),
    category,
    title: String(document.title),
    location: String(document.location),
    season: String(document.season),
    dates,
    summary: String(document.summary),
    highlights,
    image: typeof cover === "object" && cover?.url ? cover.url : staticImages[(document.staticImage as keyof typeof staticImages) ?? "lake"],
    imageAlt: typeof cover === "object" && cover?.alt ? cover.alt : `${category} z SHOWteam`,
    href: `/oferta/${slug}`,
    contactHref: `mailto:biuro@showteam.eu?subject=${encodeURIComponent(String(document.title))}`,
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
