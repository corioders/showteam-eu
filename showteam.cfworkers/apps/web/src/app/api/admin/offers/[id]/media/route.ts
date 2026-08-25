import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { createOptimizedMedia, deleteOptimizedMedia } from "@/lib/optimized-media";
import { revalidateOffers } from "@/lib/revalidate-public";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}
	const form = await request.formData();
	const field = String(form.get("field"));
	if (!/^[a-z][a-zA-Z0-9]*ImageUrl$/.test(field) || typeof form.get("descriptor") !== "string") {
		return NextResponse.json({ message: "Wybierz obsługiwane zdjęcie do 15 MB." }, { status: 400 });
	}
	let mediaId: number | undefined;
	try {
		const { id } = await params;
		const offer = await payload.findByID({ collection: "offers", id, depth: 0, overrideAccess: false, user });
		const media = await createOptimizedMedia(payload, form, `Zdjęcie — ${offer.title}`);
		mediaId = media.id;
		const pageContent =
			offer.pageContent && typeof offer.pageContent === "object" && !Array.isArray(offer.pageContent) ? (offer.pageContent as Record<string, string>) : {};
		const optimizedMedia =
			offer.optimizedMedia && typeof offer.optimizedMedia === "object" && !Array.isArray(offer.optimizedMedia)
				? (offer.optimizedMedia as Record<string, { mediaId?: number }>)
				: {};
		await payload.update({
			collection: "offers",
			id,
			data: { pageContent: { ...pageContent, [field]: media.url }, optimizedMedia: { ...optimizedMedia, [field]: { mediaId, descriptor: media.descriptor } } },
			overrideAccess: false,
			user,
		});
		const oldMediaId = optimizedMedia[field]?.mediaId;
		if (oldMediaId && oldMediaId !== mediaId) await deleteOptimizedMedia(payload, oldMediaId);
		revalidateOffers(offer.slug, offer.category);
		return NextResponse.json({ url: media.url, descriptor: media.descriptor, mediaId, message: "Zdjęcie jest już widoczne." });
	} catch (error) {
		if (mediaId) {
			await deleteOptimizedMedia(payload, mediaId);
		}
		payload.logger.error({ err: error, msg: "Inline offer media upload failed" });
		return NextResponse.json({ message: "Nie udało się zmienić zdjęcia. Wybierz je ponownie." }, { status: 500 });
	}
}
