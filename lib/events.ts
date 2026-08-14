import { getPayload } from "payload";
import config from "@payload-config";

export type PublicEvent = { id: string; title: string; startDate: string; endDate?: string; location: string; summary: string; category: string; image: string; imageAlt: string; ctaLabel: string };

function toEvent(document: Record<string, unknown>): PublicEvent | null {
  const image = document.image as { url?: string; alt?: string } | null;
  if (!image?.url) return null;
  return { id: String(document.id), title: String(document.title), startDate: String(document.startDate), endDate: document.endDate ? String(document.endDate) : undefined, location: String(document.location), summary: String(document.summary), category: String(document.category), image: image.url, imageAlt: image.alt || String(document.title), ctaLabel: String(document.ctaLabel || "Zapytaj o miejsce") };
}

export async function getEvents(): Promise<PublicEvent[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({ collection: "events", where: { published: { equals: true } }, sort: "startDate", depth: 1, limit: 100 });
  return result.docs.flatMap((document) => {
    const event = toEvent(document as unknown as Record<string, unknown>);
    return event ? [event] : [];
  });
}
