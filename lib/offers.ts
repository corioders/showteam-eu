export type OfferCategory = "Lato" | "Zima" | "Szkolenia" | "Noclegi";

export type Offer = {
  cmsId?: string;
  category: OfferCategory;
  title: string;
  location: string;
  season: string;
  dates: string[];
  summary: string;
  highlights: string[];
  image: string;
  imageAlt: string;
  href: string;
  contactHref: string;
  sections?: { title: string; body: string }[];
};

export const offers: Offer[] = [
  {
    category: "Lato",
    title: "SHOWlato 2026",
    location: "Wake & Surf Village · Poręba",
    season: "Sezon 2026",
    dates: ["28.06–10.07", "12–24.07", "26.07–7.08", "9–15.08", "15–21.08"],
    summary: "Kameralna baza nad Jeziorem Łąckim. Woda, wiatr, ruch i wakacje bez trybu oszczędzania energii.",
    highlights: ["Wakeboard i narty wodne", "Windsurfing, SUP i kajaki", "Padel, glamping i strefa chill"],
    image: "/media/summer-wake-hero.jpg",
    imageAlt: "Wakeboarding z lotu ptaka na Jeziorze Łąckim",
    href: "/oferta/lato",
    contactHref: "mailto:biuro@showteam.eu?subject=SHOWlato%202026",
  },
  {
    category: "Zima",
    title: "SHOWzima 2026",
    location: "Trentino · Dolomity",
    season: "Sezon 2026",
    dates: ["21–27.12", "27.12–2.01", "3–10.01", "17–24.01", "24–31.01", "31.01–7.02", "7–14.02", "14–21.02", "21–28.02", "28.02–7.03"],
    summary: "Rodzinne tygodnie na stoku: szkolenie, sport, włoskie jedzenie i après-ski w wydaniu SHOWteam.",
    highlights: ["Hotel na stoku", "Szkolenie dla dzieci i dorosłych", "Garda, trekking i après-ski"],
    image: "/media/showteam-winter-fire.jpg",
    imageAlt: "Zimowe atrakcje SHOWteam w Trentino",
    href: "/oferta/zima",
    contactHref: "mailto:biuro@showteam.eu?subject=SHOWzima%202026",
  },
  {
    category: "Szkolenia",
    title: "Patent i progres",
    location: "Poręba · Jezioro Łąckie",
    season: "Od 14. roku życia",
    dates: ["Terminy indywidualne", "Egzaminy w sezonie"],
    summary: "Kurs sternika motorowodnego, żeglarstwo i autorskie programy FizjoSPORT prowadzone przez praktyków.",
    highlights: ["Sternik motorowodny", "Żeglarz jachtowy", "FizjoSPORT i obozy"],
    image: "/media/summer-sailing-drone.jpg",
    imageAlt: "Szkolenie żeglarskie SHOWteam z lotu ptaka",
    href: "/oferta/szkolenia",
    contactHref: "mailto:biuro@showteam.eu?subject=Szkolenia%20SHOWteam",
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
  },
];

export const summerDates = [
  ["Turnus I", "28 czerwca – 10 lipca"],
  ["Turnus II", "12–24 lipca"],
  ["Turnus III", "26 lipca – 7 sierpnia"],
  ["Turnus IV", "9–15 sierpnia"],
  ["Turnus V", "15–21 sierpnia"],
] as const;

export const winterDates = [
  "21–27 grudnia · Boże Narodzenie",
  "27 grudnia–2 stycznia · San Silvestro",
  "3–10 stycznia",
  "17–24 stycznia",
  "24–31 stycznia",
  "31 stycznia–7 lutego",
  "7–14 lutego",
  "14–21 lutego",
  "21–28 lutego",
  "28 lutego–7 marca",
] as const;

export const contact = {
  joanna: { name: "Joanna SHOWtysek", phone: "+48 500 128 090", href: "tel:+48500128090" },
  adam: { name: "Adam SHOWtysek", phone: "+48 512 280 555", href: "tel:+48512280555" },
  email: "biuro@showteam.eu",
  instagram: "https://www.instagram.com/showteam.eu/",
  facebook: "https://www.facebook.com/SHOW.SHOWteam/",
  tiktok: "https://www.tiktok.com/@showteam1969",
  map: "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/data=!4m15!1m8!3m7!1s0x4716b016d42ca55b:0xc4af35ca30fb79f!2sNad+Zapor%C4%85+21,+43-200+Por%C4%99ba!3b1!8m2!3d49.97635!4d18.8781416!16s%2Fg%2F11hbqp7wq2!3m5!1s0x4716b016d3bd39e5:0x758abd7d20fca32b!8m2!3d49.97635!4d18.8781416!16s%2Fg%2F11g8v1zps5?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D",
};
