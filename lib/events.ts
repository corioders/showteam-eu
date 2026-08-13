import { getPayload } from "payload";
import config from "@payload-config";

export type PublicEvent = { id: string; title: string; startDate: string; endDate?: string; location: string; summary: string; category: string; image: string; imageAlt: string; ctaLabel: string };

const fallback: PublicEvent[] = [{ id: "showcamp-v", title: "SHOWCamp — Turnus V", startDate: "2026-08-15T10:00:00+02:00", endDate: "2026-08-21T16:00:00+02:00", location: "Wake & Surf Village · Poręba", summary: "Ostatni opublikowany turnus sezonu 2026 nad Jeziorem Łąckim. Skontaktuj się z SHOWteam, aby potwierdzić aktualną dostępność.", category: "Lato", image: "/media/summer-double-wake.jpg", imageAlt: "Wakeboarding podczas SHOWCamp", ctaLabel: "Zapytaj o miejsce" }];

function toEvent(document: Record<string, unknown>): PublicEvent {
  const image = document.image as { url?: string; alt?: string } | null;
  return { id: String(document.id), title: String(document.title), startDate: String(document.startDate), endDate: document.endDate ? String(document.endDate) : undefined, location: String(document.location), summary: String(document.summary), category: String(document.category), image: image?.url || "/media/summer-double-wake.jpg", imageAlt: image?.alt || String(document.title), ctaLabel: String(document.ctaLabel || "Zapytaj o miejsce") };
}

export async function getEvents(): Promise<PublicEvent[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({ collection: "events", where: { published: { equals: true } }, sort: "startDate", depth: 1, limit: 100 });
    return result.docs.length ? result.docs.map((document) => toEvent(document as unknown as Record<string, unknown>)) : fallback;
  } catch { return fallback; }
}

export async function seedEvents(payload: Awaited<ReturnType<typeof getPayload>>) {
  if ((await payload.count({ collection: "events" })).totalDocs) return;
  await payload.create({ collection: "events", data: { title: fallback[0].title, startDate: fallback[0].startDate, endDate: fallback[0].endDate, location: fallback[0].location, summary: fallback[0].summary, category: "Lato", ctaLabel: fallback[0].ctaLabel, published: true } });
}
