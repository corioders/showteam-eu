import type { Payload } from "payload";

const initialOffers = [
  {
    title: "SHOWlato 2026",
    slug: "lato",
    category: "Lato",
    season: "Sezon 2026",
    sortOrder: 10,
    location: "Wake & Surf Village · Poręba",
    summary: "Kameralna baza nad Jeziorem Łąckim. Woda, wiatr, ruch i wakacje bez trybu oszczędzania energii.",
    staticImage: "lake",
    dates: [
      { label: "Turnus I", date: "28 czerwca – 10 lipca" },
      { label: "Turnus II", date: "12–24 lipca" },
      { label: "Turnus III", date: "26 lipca – 7 sierpnia" },
      { label: "Turnus IV", date: "9–15 sierpnia" },
      { label: "Turnus V", date: "15–21 sierpnia" },
    ],
    highlights: [{ text: "Wakeboard i narty wodne" }, { text: "Windsurfing, SUP i kajaki" }, { text: "Padel, glamping i strefa chill" }],
    sections: [
      { title: "Sprzęt i instruktorzy", body: "Wakeboard, windsurfing, katamarany, SUP-y, kajaki, łodzie żaglowe, narty wodne i sprzęt motorowodny." },
      { title: "Wake & Surf Village", body: "Prywatne molo, piaszczysta plaża, strefa chill, miejsce grillowe, sauna, boisko oraz zaplecze sanitarne." },
    ],
    published: true,
  },
  {
    title: "SHOWzima 2026",
    slug: "zima",
    category: "Zima",
    season: "Sezon 2026",
    sortOrder: 20,
    location: "Trentino · Dolomity",
    summary: "Rodzinne tygodnie na stoku: szkolenie, sport, włoskie jedzenie i après-ski w wydaniu SHOWteam.",
    staticImage: "snow",
    dates: [
      "21–27 grudnia · Boże Narodzenie", "27 grudnia–2 stycznia · San Silvestro", "3–10 stycznia", "17–24 stycznia", "24–31 stycznia", "31 stycznia–7 lutego", "7–14 lutego", "14–21 lutego", "21–28 lutego", "28 lutego–7 marca",
    ].map((date) => ({ date })),
    highlights: [{ text: "Hotel na stoku" }, { text: "Szkolenie dla dzieci i dorosłych" }, { text: "Garda, trekking i après-ski" }],
    sections: [
      { title: "Szkolenie", body: "Codzienna jazda dla dzieci, młodzieży i dorosłych — od podstaw po doskonalenie techniki." },
      { title: "Après-ski", body: "Garda, trekking, lokalne smaki, integracja i niespodzianki przygotowane przez SHOWteam." },
    ],
    published: true,
  },
  {
    title: "Patent i progres",
    slug: "szkolenia",
    category: "Szkolenia",
    season: "Od 14. roku życia",
    sortOrder: 30,
    location: "Poręba · Jezioro Łąckie",
    summary: "Kurs sternika motorowodnego, żeglarstwo i autorskie programy FizjoSPORT prowadzone przez praktyków.",
    staticImage: "training",
    dates: [{ label: "Kursy", date: "Terminy indywidualne" }, { label: "Egzaminy", date: "Daty ustalane w sezonie" }],
    highlights: [{ text: "Sternik motorowodny" }, { text: "Żeglarz jachtowy" }, { text: "FizjoSPORT i obozy" }],
    sections: [
      { title: "Od jakiego wieku?", body: "Kurs sternika motorowodnego i żeglarza jachtowego jest dostępny od 14. roku życia." },
      { title: "Jak wygląda praktyka?", body: "Szkolenie odbywa się na wodzie, na sprzęcie używanym w realnych warunkach." },
    ],
    published: true,
  },
  {
    title: "Noclegi nad wodą",
    slug: "noclegi-nad-woda",
    category: "Noclegi",
    season: "Pobyt nad wodą",
    sortOrder: 40,
    location: "Wake & Surf Village · Poręba",
    summary: "Wynajem kontenerów mieszkalnych i domków holenderskich przy bazie SHOWteam nad Jeziorem Łąckim. O dostępność i warunki pobytu zapytaj bezpośrednio.",
    staticImage: "stay",
    dates: [],
    highlights: [{ text: "Kontenery mieszkalne" }, { text: "Domki holenderskie" }, { text: "Lokalizacja nad wodą" }],
    sections: [],
    published: true,
  },
];

export async function seedOffers(payload: Payload) {
  const existing = await payload.count({ collection: "offers" });
  const refreshExisting = process.env.SEED_CMS === "true";
  if (existing.totalDocs > 0 && !refreshExisting) return;
  for (const offer of initialOffers) {
    const current = refreshExisting
      ? await payload.find({ collection: "offers", where: { slug: { equals: offer.slug } }, limit: 1 })
      : null;
    if (current?.docs[0]) await payload.update({ collection: "offers", id: current.docs[0].id, data: offer as never });
    else await payload.create({ collection: "offers", data: offer as never });
  }
}
