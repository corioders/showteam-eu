import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { getPayload } from "payload";
import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import type { StaticImageImport } from "cstd-next/media/image/static-image-import.js";

import { findGalleryAsset } from "@/lib/gallery-assets";
import { type DesktopGalleryLayout, defaultMobileLayout, type MobileGalleryLayout } from "@/lib/gallery-layout";
import { resolveStaticImage } from "@/lib/static-images";

export { defaultMobileLayout, galleryLayoutClass, galleryMobileClass } from "@/lib/gallery-layout";

export type GalleryPhoto = {
	id: string;
	src: string;
	image?: OptimizedImageDescriptor | StaticImageImport;
	alt: string;
	caption: string;
	sourceUrl?: string;
	layout: DesktopGalleryLayout;
	fit: "cover" | "contain";
	objectPosition: string;
	mobileLayout: MobileGalleryLayout;
	mobilePosition: string;
	season: "Lato" | "Zima" | "Szkolenia";
	type: "image" | "video";
	editable: boolean;
	sortOrder: number;
};

export type GalleryPage = {
	photos: GalleryPhoto[];
	page: number;
	totalPages: number;
};

function toPhoto(document: Record<string, unknown>): GalleryPhoto | null {
	const media = document.image as { url?: string; alt?: string; focalX?: number; focalY?: number; mimeType?: string; optimizedImage?: OptimizedImageDescriptor } | number | null | undefined;
	const fallback = findGalleryAsset(document.staticImage);
	const fallbackImage = fallback ? resolveStaticImage(fallback.path) : undefined;
	const src = typeof media === "object" && media?.url ? media.url : fallbackImage?.src;
	if (!src) {
		return null;
	}

	const focalX = typeof media === "object" && typeof media?.focalX === "number" ? media.focalX : undefined;
	const focalY = typeof media === "object" && typeof media?.focalY === "number" ? media.focalY : undefined;
	const layout = (document.layout as GalleryPhoto["layout"]) || fallback?.layout || "square";
	const fit = (document.fit as GalleryPhoto["fit"]) || fallback?.fit || "cover";
	const objectPosition = focalX !== undefined && focalY !== undefined ? `${focalX}% ${focalY}%` : fallback?.position || "50% 50%";
	const mobilePosition = document.mobilePosition === "same" || !document.mobilePosition ? objectPosition : String(document.mobilePosition);

	return {
		id: String(document.id),
		src,
		image: typeof media === "object" && media?.optimizedImage ? media.optimizedImage : fallbackImage,
		alt: String(document.alt || (typeof media === "object" && media?.alt) || fallback?.alt || document.caption || "SHOWteam"),
		caption: String(document.caption || "SHOWteam"),
		sourceUrl: typeof document.sourceUrl === "string" ? document.sourceUrl : undefined,
		layout,
		fit,
		objectPosition,
		mobilePosition,
		mobileLayout: (document.mobileLayout as GalleryPhoto["mobileLayout"]) || defaultMobileLayout(layout),
		season: (document.season as GalleryPhoto["season"]) || fallback?.season || "Lato",
		type: typeof media === "object" && media?.mimeType?.startsWith("video/") ? "video" : "image",
		editable: true,
		sortOrder: Number(document.sortOrder ?? 0),
	};
}

const getCachedGalleryPage = unstable_cache(
	async (safePage: number, safeLimit: number, season?: GalleryPhoto["season"]): Promise<GalleryPage> => {
		const payload = await getPayload({ config });
		const result = await payload.find({
			collection: "gallery",
			where: {
				and: [{ published: { equals: true } }, ...(season ? [{ season: { equals: season } }] : [])],
			},
			sort: ["-sortOrder", "-createdAt"],
			depth: 1,
			page: safePage,
			limit: safeLimit,
		});
		const photos = result.docs.flatMap((document) => {
			const photo = toPhoto(document as unknown as Record<string, unknown>);
			return photo ? [photo] : [];
		});
		return { photos, page: result.page ?? safePage, totalPages: result.totalPages };
	},
	["showteam-gallery"],
	{ tags: ["gallery"] },
);

export async function getGalleryPage({ page = 1, limit = 24, season }: { page?: number; limit?: number; season?: GalleryPhoto["season"] } = {}): Promise<GalleryPage> {
	const safePage = Math.max(1, Math.floor(page));
	const safeLimit = Math.min(48, Math.max(1, Math.floor(limit)));
	await connection();
	return getCachedGalleryPage(safePage, safeLimit, season);
}

export async function getGallery(limit = 24): Promise<GalleryPhoto[]> {
	return (await getGalleryPage({ limit })).photos;
}
