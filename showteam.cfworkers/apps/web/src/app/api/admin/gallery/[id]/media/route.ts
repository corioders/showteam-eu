import { Buffer } from "node:buffer";

import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { createOptimizedMedia, deleteOptimizedMedia } from "@/lib/optimized-media";

const allowedTypes = new Set(["image/webp", "video/mp4", "video/webm", "video/quicktime"]);
const maxBytes = 80 * 1024 * 1024;

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
	const file = form.get("file");
	const imageUpload = typeof form.get("descriptor") === "string";
	if (!imageUpload && (!(file instanceof File) || !allowedTypes.has(file.type) || file.size === 0 || file.size > maxBytes)) {
		return NextResponse.json({ message: "Wybierz obsługiwane zdjęcie lub film do 80 MB." }, { status: 400 });
	}

	let createdId: number | undefined;
	try {
		const { id } = await params;
		const item = await payload.findByID({ collection: "gallery", id, depth: 0, overrideAccess: false, user });
		const media = imageUpload
			? await createOptimizedMedia(payload, form, item.alt || item.caption)
			: await payload.create({
					collection: "media",
					overrideAccess: true,
					data: { alt: item.alt || item.caption },
					file: { data: Buffer.from(await (file as File).arrayBuffer()), mimetype: (file as File).type, name: (file as File).name, size: (file as File).size },
				});
		createdId = Number(media.id);
		await payload.update({
			collection: "gallery",
			id,
			overrideAccess: true,
			data: { image: media.id },
		});
		const oldIds = [item.image].filter((value): value is number => typeof value === "number" && value !== createdId);
		await Promise.allSettled(oldIds.map((mediaId) => deleteOptimizedMedia(payload, mediaId)));
		return NextResponse.json({ message: "Nowy plik jest już widoczny w galerii." });
	} catch (error) {
		await deleteOptimizedMedia(payload, createdId);
		payload.logger.error({ err: error, msg: "Inline gallery media replacement failed" });
		return NextResponse.json({ message: "Nie udało się wymienić pliku. Wybierz go ponownie." }, { status: 500 });
	}
}
