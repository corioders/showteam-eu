import type { PublicEvent } from "@/lib/events";

export type EventStatus = "ongoing" | "upcoming" | "past";

const dateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export function eventStatus(event: Pick<PublicEvent, "startDate" | "endDate">, now = new Date()): EventStatus {
  const today = dateKey(now);
  const start = dateKey(event.startDate);
  const end = dateKey(event.endDate ?? event.startDate);

  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "ongoing";
}

export function groupEvents(events: PublicEvent[], now = new Date()) {
  const groups: Record<EventStatus, PublicEvent[]> = { ongoing: [], upcoming: [], past: [] };

  for (const event of events) groups[eventStatus(event, now)].push(event);
  groups.ongoing.sort((a, b) => a.startDate.localeCompare(b.startDate));
  groups.upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
  groups.past.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return groups;
}
