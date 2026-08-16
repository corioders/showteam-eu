export const pageContentDefaults = {
  home: {
    heroBadge: "Sezon 2026",
    locationPorebaLabel: "Poręba",
    locationPorebaUrl: "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/",
    locationDolomityLabel: "Dolomity",
    locationDolomityUrl: "https://www.google.com/maps/search/?api=1&query=Trentino+Dolomites+Italy",
    locationAndorraLabel: "Andorra",
    locationAndorraUrl: "https://www.google.com/maps/search/?api=1&query=Grandvalira+Andorra",
    heroTitleTop: "Zrób",
    heroTitleAccent: "sobie SHOW.",
    heroDescription: "Sport, podróże i ludzie z energią. Od własnej plaży nad Jeziorem Łąckim po śnieg w Dolomitach.",
    heroPrimaryCta: "Poznaj ofertę",
    heroSecondaryCta: "Kontakt i o nas",
    ticker: "Wake · Wind · Snow · Camp · Padel · Adventure · FizjoSPORT",
    legacyTagline: "Just 4 fun",
    legacyNoLimits: "no limits...",
    offersEyebrow: "Wybierz swój kierunek",
    offersTitleTop: "Zrób sobie",
    offersTitleAccent: "SHOW.",
    offersDescription: "Nie wybieramy między sportem a odpoczynkiem. Łączymy je w programach dla rodzin, dzieci, grup i dorosłych, którzy nadal chcą próbować nowych rzeczy.",
    planEyebrow: "Plan na cały rok",
    planTitle: "Nie czekaj na dobry moment.",
    aboutImageCaption: "Jedyny taki adres na Śląsku.",
    aboutEyebrow: "SHOWteam od środka",
    aboutTitle: "Robimy rzeczy razem.",
    aboutBody: "Joanna i Adam SHOWtysek od lat budują aktywną społeczność wokół sportu, dobrej energii i miejsc, do których chce się wracać. Profesjonalnie, osobiście i z charakterem.",
    aboutCta: "Poznaj SHOWteam",
    galleryEyebrow: "Prosto z akcji",
    galleryTitle: "#showteam.eu",
    galleryCta: "Otwórz całą galerię",
    finalCtaTitle: "Masz ochotę na SHOW?",
  },
  contact: {
    eyebrow: "Porozmawiajmy",
    title: "Say\nhello!",
    intro: "Najlepszy plan zaczyna się od krótkiej rozmowy. Powiedz, co chcesz robić — dobierzemy miejsce, termin i poziom aktywności.",
    joannaName: "Joanna SHOWtysek",
    joannaPhone: "+48 500 128 090",
    adamName: "Adam SHOWtysek",
    adamPhone: "+48 512 280 555",
    email: "biuro@showteam.eu",
    locationName: "Wake & Surf Village",
    address: "Poręba, ul. Nad Zaporą 21",
    mapUrl: "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/",
    instagramUrl: "https://www.instagram.com/showteam.eu/",
    facebookUrl: "https://www.facebook.com/SHOW.SHOWteam/",
    tiktokUrl: "https://www.tiktok.com/@showteam1969",
    aboutEyebrow: "O nas",
    aboutTitle: "Asia, Adam i SHOWteam.",
    aboutBody1: "SHOWteam tworzą Joanna i Adam SHOWtysek. Od lat łączą ludzi wokół sportów wodnych, zimowych wyjazdów i aktywnego czasu spędzanego razem.",
    aboutBody2: "Naszą bazą jest Wake & Surf Village nad Jeziorem Łąckim w Porębie. Stąd ruszamy na wodę, szkolenia, obozy i wyjazdy w góry — osobiście prowadzimy każdy projekt i pozostajemy w bezpośrednim kontakcie z uczestnikami.",
  },
  gallery: {
    eyebrow: "Bez stocków. Prosto z akcji.",
    title: "Galeria\nSHOWteam.",
    description: "Jezioro Łąckie, Dolomity i Andorra — obozy, wyjazdy i codzienność SHOWteam uchwycone w akcji.",
  },
  reservations: {
    eyebrow: "Wake & Surf Village · Poręba",
    title: "Sprzęt czeka.\nWybierz godzinę.",
    description: "Wybierz sprzęt i wolny termin. Bez telefonu, kolejek i zgadywania — numer rezerwacji dostajesz od razu.",
  },
} as const;

export type PageContentName = keyof typeof pageContentDefaults;
export type PageContentValues<T extends PageContentName> = { [K in keyof typeof pageContentDefaults[T]]: string };

export function isPageContentName(value: string): value is PageContentName {
  return value in pageContentDefaults;
}

export function parsePageContent<T extends PageContentName>(page: T, input: unknown): { data?: PageContentValues<T>; errors?: string[] } {
  if (!input || typeof input !== "object") return { errors: ["Nie udało się odczytać zmian. Odśwież stronę i spróbuj ponownie."] };
  const source = input as Record<string, unknown>;
  const defaults = pageContentDefaults[page];
  const data = {} as PageContentValues<T>;
  const errors: string[] = [];
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    const value = source[String(key)];
    if (typeof value !== "string" || !value.trim()) errors.push(`Pole „${String(key)}” nie może być puste.`);
    else if (value.length > 1200) errors.push(`Pole „${String(key)}” jest za długie.`);
    else if (String(key).endsWith("Url") && !isSafeWebUrl(value)) errors.push("Link musi zaczynać się od https:// lub http://.");
    else data[key] = value.trim() as PageContentValues<T>[typeof key];
  }
  return errors.length ? { errors } : { data };
}

function isSafeWebUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
