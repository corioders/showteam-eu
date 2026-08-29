// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
import { Buffer } from "node:buffer";

import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { createOptimizedMedia, deleteOptimizedMedia } from "@/lib/optimized-media";
import { isPageContentName, pageContentDefaults, parsePageContent } from "@/lib/page-content-schema";

const imageTypes = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export async function POST(request: Request, { params }: { params: Promise<{ page: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}

	const { page } = await params;
	if (!isPageContentName(page)) {
		return NextResponse.json({ message: "Nieznana strona." }, { status: 404 });
	}
	const form = await request.formData();
	const field = String(form.get("field"));
	const file = form.get("file");
	const defaultValue = pageContentDefaults[page][field as keyof (typeof pageContentDefaults)[typeof page]];
	const kind = field.endsWith("VideoUrl") ? "video" : field.endsWith("ImageUrl") || field.endsWith("PosterUrl") ? "image" : undefined;
	const acceptedTypes = kind === "image" ? imageTypes : videoTypes;
	const optimizedImage = kind === "image" && typeof form.get("descriptor") === "string";
	if (
		typeof defaultValue !== "string" ||
		!kind ||
		(!optimizedImage && (!(file instanceof File) || file.size === 0 || file.size > 80 * 1024 * 1024 || !acceptedTypes.has(file.type)))
	) {
		return NextResponse.json({ message: "Wybierz obsługiwane zdjęcie lub film do 80 MB." }, { status: 400 });
	}

	let mediaId: number | undefined;
	try {
		const existing = await payload.find({ collection: "page-content", where: { page: { equals: page } }, limit: 1, depth: 0, overrideAccess: true });
		const current =
			existing.docs[0]?.content && typeof existing.docs[0].content === "object" && !Array.isArray(existing.docs[0].content)
				? (existing.docs[0].content as Record<string, string>)
				: {};
		const currentMedia =
			existing.docs[0]?.optimizedMedia && typeof existing.docs[0].optimizedMedia === "object" && !Array.isArray(existing.docs[0].optimizedMedia)
				? (existing.docs[0].optimizedMedia as Record<string, { mediaId?: number }>)
				: {};
		const media = optimizedImage
			? await createOptimizedMedia(payload, form, "Zdjęcie na stronie SHOWteam")
			: await payload.create({
					collection: "media",
					overrideAccess: true,
					data: { alt: "Film na stronie SHOWteam" },
					file: { data: Buffer.from(await (file as File).arrayBuffer()), mimetype: (file as File).type, name: (file as File).name, size: (file as File).size },
				});
		mediaId = Number(media.id);
		const mediaUrl = optimizedImage ? (media as Awaited<ReturnType<typeof createOptimizedMedia>>).url : media.url;
		const parsed = parsePageContent(page, { ...pageContentDefaults[page], ...current, [field]: mediaUrl });
		if (!parsed.data) {
			throw new Error(parsed.errors?.[0]);
		}
		if (existing.docs[0]) {
			await payload.update({
				collection: "page-content",
				id: existing.docs[0].id,
				data: {
					content: parsed.data,
					optimizedMedia: optimizedImage
						? { ...currentMedia, [field]: { mediaId, descriptor: (media as Awaited<ReturnType<typeof createOptimizedMedia>>).descriptor } }
						: currentMedia,
				},
				overrideAccess: false,
				user,
			});
		} else {
			await payload.create({
				collection: "page-content",
				data: {
					page,
					content: parsed.data,
					optimizedMedia: optimizedImage ? { [field]: { mediaId, descriptor: (media as Awaited<ReturnType<typeof createOptimizedMedia>>).descriptor } } : {},
				},
				overrideAccess: false,
				user,
			});
		}
		const oldMediaId = currentMedia[field]?.mediaId;
		if (optimizedImage && oldMediaId && oldMediaId !== mediaId) {
			await deleteOptimizedMedia(payload, oldMediaId);
		}
		return NextResponse.json({
			url: mediaUrl,
			descriptor: optimizedImage ? (media as Awaited<ReturnType<typeof createOptimizedMedia>>).descriptor : undefined,
			mediaId,
			message: "Plik jest już widoczny na stronie.",
		});
	} catch (error) {
		if (mediaId) {
			await deleteOptimizedMedia(payload, mediaId);
		}
		payload.logger.error({ err: error, msg: "Inline page media upload failed" });
		return NextResponse.json({ message: "Nie udało się wysłać pliku. Wybierz go ponownie." }, { status: 500 });
	}
}
