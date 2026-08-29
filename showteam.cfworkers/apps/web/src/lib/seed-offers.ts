// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and test environment variables are runtime bindings.
import type { Payload } from "payload";

const initialOffers = [
	{
		title: "Lato 2026/2027",
		slug: "lato",
		category: "Lato",
		season: "Sezon 2026/2027",
		sortOrder: 10,
		location: "WAKE & SURF Village · Poręba",
		mapUrl: "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/",
		ctaTitle: "Wskakujesz do wody?",
		summary: "Kameralna baza nad Jeziorem Łąckim. Woda, wiatr, ruch i wakacje bez trybu oszczędzania energii.",
		staticImage: "lake",
		dates: [],
		highlights: [{ text: "Wakeboard i narty wodne" }, { text: "Windsurfing, SUP i kajaki" }, { text: "Padel, glamping i strefa chill" }],
		sections: [
			{ title: "Sprzęt i instruktorzy", body: "Wakeboard, windsurfing, katamarany, SUP-y, kajaki, łodzie żaglowe, narty wodne i sprzęt motorowodny." },
			{ title: "WAKE & SURF Village", body: "Prywatne molo, piaszczysta plaża, strefa chill, miejsce grillowe, sauna, boisko oraz zaplecze sanitarne." },
		],
		pageContent: {},
		published: true,
	},
	{
		title: "Zima 2026/2027",
		slug: "zima",
		category: "Zima",
		season: "Sezon 2026/2027",
		sortOrder: 20,
		location: "Trentino · Dolomity",
		mapUrl: "https://www.google.com/maps/search/?api=1&query=Trentino+Dolomites+Italy",
		ctaTitle: "Jedziesz z nami?",
		summary: "Rodzinne tygodnie na stoku: szkolenie, sport, włoskie przysmaki i après-ski w wydaniu SHOWteam.",
		staticImage: "snow",
		dates: [{ label: "Pireneje", startDate: "2027-03-14", endDate: "2027-03-25" }],
		highlights: [{ text: "Trentino" }, { text: "Andorra i Pireneje" }, { text: "Lodowiec w listopadzie" }],
		sections: [
			{ title: "Szkolenie", body: "Codzienna jazda dla dzieci, młodzieży i dorosłych — od podstaw po doskonalenie techniki." },
			{ title: "Après-ski", body: "Garda, trekking, lokalne smaki, integracja i niespodzianki przygotowane przez SHOWteam." },
		],
		pageContent: {},
		published: true,
	},
	{
		title: "Patent i progres",
		slug: "szkolenia",
		category: "Szkolenia",
		season: "Od 14. roku życia",
		sortOrder: 30,
		location: "Poręba · Jezioro Łąckie",
		mapUrl: "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/",
		ctaTitle: "Zaczynamy trening?",
		summary: "Kurs sternika motorowodnego, żeglarza jachtowego i operatora radiowego oraz praktyczne szkolenia z aktywności dostępnych w bazie.",
		staticImage: "training",
		dates: [],
		highlights: [{ text: "Sternik motorowodny" }, { text: "Żeglarz jachtowy" }, { text: "Operator radiowy" }],
		sections: [
			{ title: "Od jakiego wieku?", body: "Kurs sternika motorowodnego i żeglarza jachtowego jest dostępny od 14. roku życia." },
			{ title: "Jak wygląda praktyka?", body: "Szkolenie odbywa się na wodzie, na sprzęcie używanym w realnych warunkach." },
		],
		pageContent: {},
		published: true,
	},
	{
		title: "Noclegi nad wodą",
		slug: "noclegi-nad-woda",
		category: "Noclegi",
		season: "Pobyt nad wodą",
		sortOrder: 40,
		location: "WAKE & SURF Village · Poręba",
		mapUrl: "https://www.google.com/maps/place/SHOWteam+WAKE+%26+SURF+Village/@49.97635,18.8755667,17z/",
		ctaTitle: "Rezerwujesz pobyt?",
		summary: "Wynajem kontenerów mieszkalnych i domków holenderskich przy bazie SHOWteam nad Jeziorem Łąckim. O dostępność i warunki pobytu zapytaj bezpośrednio.",
		staticImage: "stay",
		dates: [],
		highlights: [{ text: "Kontenery mieszkalne" }, { text: "Domki holenderskie" }, { text: "Lokalizacja nad wodą" }],
		sections: [],
		pageContent: {},
		published: true,
	},
];

export async function seedOffers(payload: Payload) {
	const existing = await payload.count({ collection: "offers" });
	const refreshExisting = process.env.SEED_CMS === "true";
	if (existing.totalDocs > 0 && !refreshExisting) {
		return;
	}
	for (const offer of initialOffers) {
		const current = refreshExisting ? await payload.find({ collection: "offers", where: { slug: { equals: offer.slug } }, limit: 1 }) : null;
		if (current?.docs[0]) {
			await payload.update({ collection: "offers", id: current.docs[0].id, data: offer as never, context: { disableRevalidate: true } });
		} else {
			await payload.create({ collection: "offers", data: offer as never, context: { disableRevalidate: true } });
		}
	}
}
