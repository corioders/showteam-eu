import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { parseEditableOffer } from "@/lib/editor-offers";
import { deleteOptimizedMedia } from "@/lib/optimized-media";
import { revalidateOffers } from "@/lib/revalidate-public";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}

	const parsed = parseEditableOffer(await request.json().catch(() => null));
	if (!parsed.data) {
		return NextResponse.json({ message: "Sprawdź zaznaczone informacje.", errors: parsed.errors }, { status: 400 });
	}

	try {
		const { id } = await params;
		const data = parsed.data;
		const updatedOffer = await payload.update({
			collection: "offers",
			id,
			data: {
				...data,
				dates: data.dates,
				highlights: data.highlights.map((text) => ({ text })),
				sections: data.sections,
			},
			overrideAccess: false,
			user,
		});
		revalidateOffers(updatedOffer.slug, updatedOffer.category);
		return NextResponse.json({ message: "Oferta została opublikowana." });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Visual offer update failed" });
		return NextResponse.json({ message: "Nie udało się zapisać oferty. Twoja treść nadal jest w formularzu — spróbuj ponownie." }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}
	try {
		const { id } = await params;
		const offer = await payload.findByID({ collection: "offers", id, depth: 0, overrideAccess: false, user });
		await payload.delete({ collection: "offers", id, overrideAccess: false, user });
		const optimizedMedia = offer.optimizedMedia && typeof offer.optimizedMedia === "object" ? Object.values(offer.optimizedMedia) : [];
		const mediaIds = [
			typeof offer.cover === "number" ? offer.cover : null,
			...optimizedMedia.map((entry) => (entry && typeof entry === "object" && "mediaId" in entry ? Number(entry.mediaId) : null)),
		];
		await Promise.allSettled(mediaIds.map((mediaId) => deleteOptimizedMedia(payload, mediaId)));
		revalidateOffers(offer.slug, offer.category);
		return NextResponse.json({ message: "Oferta została usunięta." });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Inline offer deletion failed" });
		return NextResponse.json({ message: "Nie udało się usunąć oferty. Spróbuj ponownie." }, { status: 500 });
	}
}
