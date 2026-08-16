import type { OfferDate } from "@/lib/offer-dates";

const baseMap = "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/data=!4m15!1m8!3m7!1s0x4716b016d42ca55b:0xc4af35ca30fb79f!2sNad+Zapor%C4%85+21,+43-200+Por%C4%99ba!3b1!8m2!3d49.97635!4d18.8781416!16s%2Fg%2F11hbqp7wq2!3m5!1s0x4716b016d3bd39e5:0x758abd7d20fca32b!8m2!3d49.97635!4d18.8781416!16s%2Fg%2F11g8v1zps5?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D";

export type OfferCategory = "Lato" | "Zima" | "Szkolenia" | "Noclegi";

export type Offer = {
  cmsId?: string;
  category: OfferCategory;
  title: string;
  location: string;
  season: string;
  dates: OfferDate[];
  summary: string;
  highlights: string[];
  image: string;
  imageAlt: string;
  href: string;
  contactHref: string;
  slug: string;
  mapUrl: string;
  ctaTitle: string;
  sortOrder: number;
  published: boolean;
  pageContent: Record<string, string>;
  sections: { title: string; body: string }[];
};

export const offers: Offer[] = [
  {
    category: "Lato",
    title: "SHOWlato 2026",
    location: "Wake & Surf Village · Poręba",
    season: "Sezon 2026",
    dates: [
      { label: "Turnus I", startDate: "2026-06-28", endDate: "2026-07-10" },
      { label: "Turnus II", startDate: "2026-07-12", endDate: "2026-07-24" },
      { label: "Turnus III", startDate: "2026-07-26", endDate: "2026-08-07" },
      { label: "Turnus IV", startDate: "2026-08-09", endDate: "2026-08-15" },
      { label: "Turnus V", startDate: "2026-08-15", endDate: "2026-08-21" },
    ],
    summary: "Kameralna baza nad Jeziorem Łąckim. Woda, wiatr, ruch i wakacje bez trybu oszczędzania energii.",
    highlights: ["Wakeboard i narty wodne", "Windsurfing, SUP i kajaki", "Padel, glamping i strefa chill"],
    image: "/media/summer-wake-hero.jpg",
    imageAlt: "Wakeboarding z lotu ptaka na Jeziorze Łąckim",
    href: "/oferta/lato",
    contactHref: "mailto:biuro@showteam.eu?subject=SHOWlato%202026",
    slug: "lato", mapUrl: baseMap, ctaTitle: "Wskakujesz do wody?", sortOrder: 10, published: true, pageContent: {}, sections: [],
  },
  {
    category: "Zima",
    title: "SHOWzima 2026",
    location: "Trentino · Dolomity",
    season: "Sezon 2026",
    dates: [
      { label: "Boże Narodzenie", startDate: "2025-12-21", endDate: "2025-12-27" },
      { label: "San Silvestro", startDate: "2025-12-27", endDate: "2026-01-02" },
      { label: "Turnus III", startDate: "2026-01-03", endDate: "2026-01-10" },
      { label: "Turnus IV", startDate: "2026-01-17", endDate: "2026-01-24" },
      { label: "Turnus V", startDate: "2026-01-24", endDate: "2026-01-31" },
      { label: "Turnus VI", startDate: "2026-01-31", endDate: "2026-02-07" },
      { label: "Turnus VII", startDate: "2026-02-07", endDate: "2026-02-14" },
      { label: "Turnus VIII", startDate: "2026-02-14", endDate: "2026-02-21" },
      { label: "Turnus IX", startDate: "2026-02-21", endDate: "2026-02-28" },
      { label: "Turnus X", startDate: "2026-02-28", endDate: "2026-03-07" },
    ],
    summary: "Rodzinne tygodnie na stoku: szkolenie, sport, włoskie jedzenie i après-ski w wydaniu SHOWteam.",
    highlights: ["Hotel na stoku", "Szkolenie dla dzieci i dorosłych", "Garda, trekking i après-ski"],
    image: "/media/showteam-winter-fire.jpg",
    imageAlt: "Zimowe atrakcje SHOWteam w Trentino",
    href: "/oferta/zima",
    contactHref: "mailto:biuro@showteam.eu?subject=SHOWzima%202026",
    slug: "zima", mapUrl: "https://www.google.com/maps/search/?api=1&query=Trentino+Dolomites+Italy", ctaTitle: "Jedziesz z nami?", sortOrder: 20, published: true, pageContent: {}, sections: [],
  },
  {
    category: "Szkolenia",
    title: "Patent i progres",
    location: "Poręba · Jezioro Łąckie",
    season: "Od 14. roku życia",
    dates: [],
    summary: "Kurs sternika motorowodnego, żeglarstwo i autorskie programy FizjoSPORT prowadzone przez praktyków.",
    highlights: ["Sternik motorowodny", "Żeglarz jachtowy", "FizjoSPORT i obozy"],
    image: "/media/summer-sailing-drone.jpg",
    imageAlt: "Szkolenie żeglarskie SHOWteam z lotu ptaka",
    href: "/oferta/szkolenia",
    contactHref: "mailto:biuro@showteam.eu?subject=Szkolenia%20SHOWteam",
    slug: "szkolenia", mapUrl: baseMap, ctaTitle: "Zaczynamy trening?", sortOrder: 30, published: true, pageContent: {}, sections: [],
  },
  {
    category: "Noclegi",
    title: "Noclegi nad wodą",
    location: "Wake & Surf Village · Poręba",
    season: "Pobyt nad wodą",
    dates: [],
    summary: "Wynajem kontenerów mieszkalnych i domków holenderskich przy bazie SHOWteam nad Jeziorem Łąckim. O dostępność i warunki pobytu zapytaj bezpośrednio.",
    highlights: ["Kontenery mieszkalne", "Domki holenderskie", "Lokalizacja nad wodą"],
    image: "/media/base-life.jpg",
    imageAlt: "Sprzęt wodny przy bazie SHOWteam nad Jeziorem Łąckim",
    href: "/oferta/noclegi-nad-woda",
    contactHref: "mailto:biuro@showteam.eu?subject=Noclegi%20nad%20wod%C4%85",
    slug: "noclegi-nad-woda", mapUrl: baseMap, ctaTitle: "Rezerwujesz pobyt?", sortOrder: 40, published: true, pageContent: {}, sections: [],
  },
];

export const contact = {
  joanna: { name: "Joanna SHOWtysek", phone: "+48 500 128 090", href: "tel:+48500128090" },
  adam: { name: "Adam SHOWtysek", phone: "+48 512 280 555", href: "tel:+48512280555" },
  email: "biuro@showteam.eu",
  instagram: "https://www.instagram.com/showteam.eu/",
  facebook: "https://www.facebook.com/SHOW.SHOWteam/",
  tiktok: "https://www.tiktok.com/@showteam1969",
  map: baseMap,
};
