import { getPayload } from "payload";
import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { findGalleryAsset } from "@/lib/gallery-assets";
import { defaultMobileLayout, type DesktopGalleryLayout, type MobileGalleryLayout } from "@/lib/gallery-layout";
export { defaultMobileLayout, galleryLayoutClass, galleryMobileClass } from "@/lib/gallery-layout";

export type GalleryPhoto = {
  id: string;
  src: string;
  smallSrc?: string;
  mediumSrc?: string;
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
  const media = document.image as { url?: string; alt?: string; focalX?: number; focalY?: number; mimeType?: string } | number | null | undefined;
  const responsiveSmall = document.responsiveSmall as { url?: string } | number | null | undefined;
  const responsiveMedium = document.responsiveMedium as { url?: string } | number | null | undefined;
  const fallback = findGalleryAsset(document.staticImage);
  const src = typeof media === "object" && media?.url ? media.url : fallback?.path;
  if (!src) return null;

  const focalX = typeof media === "object" && typeof media?.focalX === "number" ? media.focalX : undefined;
  const focalY = typeof media === "object" && typeof media?.focalY === "number" ? media.focalY : undefined;
  const layout = (document.layout as GalleryPhoto["layout"]) || fallback?.layout || "square";
  const fit = (document.fit as GalleryPhoto["fit"]) || fallback?.fit || "cover";
  const objectPosition = focalX !== undefined && focalY !== undefined ? `${focalX}% ${focalY}%` : fallback?.position || "50% 50%";
  const mobilePosition = document.mobilePosition === "same" || !document.mobilePosition ? objectPosition : String(document.mobilePosition);

  return {
    id: String(document.id),
    src,
    smallSrc: typeof responsiveSmall === "object" ? responsiveSmall?.url : undefined,
    mediumSrc: typeof responsiveMedium === "object" ? responsiveMedium?.url : undefined,
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

const getCachedGalleryPage = unstable_cache(async (safePage: number, safeLimit: number, season?: GalleryPhoto["season"]): Promise<GalleryPage> => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "gallery",
    where: {
      and: [
        { published: { equals: true } },
        ...(season ? [{ season: { equals: season } }] : []),
      ],
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
}, ["showteam-gallery"], { tags: ["gallery"] });

export async function getGalleryPage({ page = 1, limit = 24, season }: { page?: number; limit?: number; season?: GalleryPhoto["season"] } = {}): Promise<GalleryPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(48, Math.max(1, Math.floor(limit)));
  await connection();
  return getCachedGalleryPage(safePage, safeLimit, season);
}

export async function getGallery(limit = 24): Promise<GalleryPhoto[]> {
  return (await getGalleryPage({ limit })).photos;
}
