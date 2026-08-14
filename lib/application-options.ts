import type { Offer, OfferCategory } from "@/lib/offers";

export const applicationCategories = ["Lato", "Zima", "Szkolenia"] as const;
export type ApplicationCategory = (typeof applicationCategories)[number];
export type ApplicationOfferGroup = { category: ApplicationCategory; offers: { title: string; dates: string[] }[] };

const polishMonths: Record<string, number> = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, pazdziernika: 10, października: 10, listopada: 11, grudnia: 12,
};

function seasonYear(offer: Offer) {
  const years = `${offer.season} ${offer.title}`.match(/20\d{2}/g);
  return years ? Number(years.at(-1)) : undefined;
}

function inferredYear(category: OfferCategory, month: number, year: number) {
  return category === "Zima" && month >= 9 ? year - 1 : year;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function applicationDateIsAvailable(label: string, offer: Offer, today: string) {
  const year = seasonYear(offer);
  if (!year) return true;

  const numericEnd = label.match(/(?:^|[–—-])\s*(\d{1,2})[./](\d{1,2})(?:[./](20\d{2}))?(?:\s*[·,].*)?\s*$/);
  if (numericEnd) {
    const month = Number(numericEnd[2]);
    const endYear = numericEnd[3] ? Number(numericEnd[3]) : inferredYear(offer.category, month, year);
    return dateKey(endYear, month, Number(numericEnd[1])) >= today;
  }

  const polishEnd = label.toLocaleLowerCase("pl-PL").match(/(?:^|[–—-])\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(20\d{2}))?(?:\s*[·,].*)?\s*$/);
  const month = polishEnd ? polishMonths[polishEnd[2]] : undefined;
  if (polishEnd && month) {
    const endYear = polishEnd[3] ? Number(polishEnd[3]) : inferredYear(offer.category, month, year);
    return dateKey(endYear, month, Number(polishEnd[1])) >= today;
  }

  return true;
}

export function getApplicationOfferGroups(offers: Offer[], today: string): ApplicationOfferGroup[] {
  return applicationCategories.map((category) => ({
    category,
    offers: offers
      .filter((offer) => offer.category === category)
      .flatMap((offer) => {
        const dates = offer.dates.filter((date) => applicationDateIsAvailable(date, offer, today));
        return offer.dates.length > 0 && dates.length === 0 ? [] : [{ title: offer.title, dates }];
      }),
  }));
}
