import { formatOfferDateRange, type OfferDate } from "./offer-dates";
import type { Offer } from "@/lib/offers";

export const applicationCategories = ["Lato", "Zima", "Szkolenia"] as const;
export type ApplicationCategory = (typeof applicationCategories)[number];
export type ApplicationOfferGroup = { category: ApplicationCategory; offers: { title: string; dates: OfferDate[] }[] };

export function applicationDateIsAvailable(date: OfferDate, today: string) {
  return date.endDate >= today;
}

export function applicationOfferValue(title: string, date: OfferDate) {
  return `${title} — ${date.label} · ${formatOfferDateRange(date)}`;
}

export function getApplicationOfferGroups(offers: Offer[], today: string): ApplicationOfferGroup[] {
  return applicationCategories.map((category) => ({
    category,
    offers: offers
      .filter((offer) => offer.category === category)
      .flatMap((offer) => {
        const dates = offer.dates.filter((date) => applicationDateIsAvailable(date, today));
        return offer.dates.length > 0 && dates.length === 0 ? [] : [{ title: offer.title, dates }];
      }),
  }));
}
