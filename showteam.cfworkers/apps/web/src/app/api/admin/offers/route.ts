import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { contact } from "@/lib/offers";

export async function POST(request: Request) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}

	try {
		const last = await payload.find({ collection: "offers", sort: "-sortOrder", limit: 1, depth: 0, overrideAccess: true });
		const offer = await payload.create({
			collection: "offers",
			overrideAccess: false,
			user,
			data: {
				title: "Nowa oferta",
				slug: `nowa-oferta-${Date.now()}`,
				category: "Lato",
				location: "Wpisz lokalizację",
				summary: "Wpisz krótki opis nowej oferty. Po zapisaniu możesz od razu uzupełnić całą stronę.",
				season: "Nowa oferta",
				mapUrl: contact.map,
				ctaTitle: "Jedziesz z nami?",
				dates: [],
				highlights: [],
				sections: [],
				pageContent: {},
				published: false,
				staticImage: "lake",
				sortOrder: Number(last.docs[0]?.sortOrder ?? 0) + 10,
			},
		});
		return NextResponse.json({ href: `/oferta/${offer.slug}` });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Inline offer creation failed" });
		return NextResponse.json({ message: "Nie udało się utworzyć nowej oferty. Spróbuj ponownie." }, { status: 500 });
	}
}
