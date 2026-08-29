import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { createOptimizedMedia, deleteOptimizedMedia } from "@/lib/optimized-media";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}
	const data = await request.formData();

	let mediaId: number | undefined;
	try {
		const { id } = await params;
		const offer = await payload.findByID({ collection: "offers", id, depth: 0, overrideAccess: false, user });
		const media = await createOptimizedMedia(payload, data, `Zdjęcie okładkowe — ${offer.title}`);
		mediaId = media.id;
		await payload.update({ collection: "offers", id, data: { cover: media.id }, overrideAccess: false, user });
		if (typeof offer.cover === "number" && offer.cover !== mediaId) {
			await deleteOptimizedMedia(payload, offer.cover);
		}
		return NextResponse.json({ url: media.url, descriptor: media.descriptor, mediaId: media.id, message: "Zdjęcie jest już widoczne na stronie." });
	} catch (error) {
		if (mediaId) {
			await deleteOptimizedMedia(payload, mediaId);
		}
		payload.logger.error({ err: error, msg: "Inline offer cover upload failed" });
		return NextResponse.json({ message: "Nie udało się zmienić zdjęcia. Wybierz je ponownie." }, { status: 500 });
	}
}
