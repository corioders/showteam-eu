// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
import { Buffer } from "node:buffer";

import config from "@payload-config";
import { getPayload } from "payload";

import { parseFocalPoints } from "@/lib/gallery-focal";
import { createOptimizedMedia, deleteOptimizedMedia } from "@/lib/optimized-media";
import { revalidateGallery } from "@/lib/revalidate-public";

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const CATEGORIES = new Set(["Lato", "Zima", "Szkolenia"]);
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Nieprawidłowe źródło żądania." }, { status: 403 });
	}
	if (Number(request.headers.get("content-length") || 0) > MAX_TOTAL_BYTES + 1024 * 1024) {
		return Response.json({ error: "Łączny limit jednego dodawania to 80 MB." }, { status: 413 });
	}

	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return Response.json({ error: "Sesja wygasła. Zaloguj się ponownie." }, { status: 401 });
	}

	const data = await request.formData();
	const itemCount = Number(data.get("itemCount"));
	const category = String(data.get("category") || "Lato");
	const caption = String(data.get("caption") || "")
		.trim()
		.slice(0, 100);
	if (!Number.isInteger(itemCount) || itemCount < 1 || itemCount > 8 || !CATEGORIES.has(category)) {
		return Response.json({ error: "Nieprawidłowe pliki lub kategoria." }, { status: 400 });
	}
	const focalPoints = parseFocalPoints(data.get("focalPoints"), itemCount);
	const totalBytes = [...data.values()].reduce((sum, value) => sum + (value instanceof File ? value.size : 0), 0);
	if (totalBytes > MAX_TOTAL_BYTES) {
		return Response.json({ error: "Łączny limit jednego dodawania to 80 MB." }, { status: 413 });
	}

	const createdMedia: number[] = [];
	const createdGallery: number[] = [];
	try {
		for (let index = 0; index < itemCount; index += 1) {
			const videoFile = data.get(`file-${index}`);
			const image = typeof data.get(`descriptor-${index}`) === "string";
			if (!image && (!(videoFile instanceof File) || !VIDEO_TYPES.has(videoFile.type) || videoFile.size === 0)) {
				throw new Error("Nieobsługiwany plik.");
			}
			const originalName = image ? `SHOWteam ${index + 1}` : (videoFile as File).name;
			const itemCaption =
				caption ||
				originalName
					.replace(/\.[^.]+$/, "")
					.replaceAll(/[-_]+/g, " ")
					.trim() ||
				"SHOWteam";
			let mediaId: number;
			if (image) {
				const imageForm = new FormData();
				imageForm.set("descriptor", String(data.get(`descriptor-${index}`)));
				for (const artifact of data.getAll(`artifacts-${index}`)) {
					imageForm.append("artifacts", artifact);
				}
				mediaId = (await createOptimizedMedia(payload, imageForm, itemCaption)).id;
			} else {
				const file = videoFile as File;
				const media = await payload.create({
					collection: "media",
					overrideAccess: true,
					data: { alt: itemCaption, focalX: focalPoints[index]?.x, focalY: focalPoints[index]?.y },
					file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size },
				});
				mediaId = Number(media.id);
			}
			createdMedia.push(mediaId);
			const galleryItem = await payload.create({
				collection: "gallery",
				overrideAccess: true,
				data: {
					image: mediaId,
					caption: itemCaption,
					alt: itemCaption,
					season: category as "Lato" | "Zima" | "Szkolenia",
					layout: image ? "square" : "wide",
					mobileLayout: image ? "square" : "landscape",
					fit: "cover",
					mobilePosition: "same",
					sortOrder: Date.now() + index,
					published: true,
				},
			});
			createdGallery.push(Number(galleryItem.id));
		}
		revalidateGallery();
		return Response.json({ count: itemCount });
	} catch (error) {
		await Promise.allSettled(createdGallery.map((id) => payload.delete({ collection: "gallery", id, overrideAccess: true })));
		await Promise.allSettled(createdMedia.map((id) => deleteOptimizedMedia(payload, id)));
		payload.logger.error({ err: error, msg: "Quick gallery upload failed" });
		const message = process.env.APP_ENV === "preview" && error instanceof Error ? error.message : "Nie udało się zapisać plików. Spróbuj ponownie.";
		return Response.json({ error: message }, { status: 500 });
	}
}
