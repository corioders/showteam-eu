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
	const form = await request.formData();
	let createdId: number | undefined;
	try {
		const { id } = await params;
		const equipment = await payload.findByID({ collection: "equipment", id, depth: 0, overrideAccess: false, user });
		const media = await createOptimizedMedia(payload, form, equipment.name);
		createdId = media.id;
		await payload.update({ collection: "equipment", id, data: { image: media.id }, overrideAccess: false, user });
		if (typeof equipment.image === "number" && equipment.image !== createdId) {
			await deleteOptimizedMedia(payload, equipment.image);
		}
		return NextResponse.json({ message: "Zdjęcie aktywności jest już widoczne." });
	} catch (error) {
		if (createdId) {
			await deleteOptimizedMedia(payload, createdId);
		}
		payload.logger.error({ err: error, msg: "Inline equipment image upload failed" });
		return NextResponse.json({ message: "Nie udało się zmienić zdjęcia. Wybierz je ponownie." }, { status: 500 });
	}
}
