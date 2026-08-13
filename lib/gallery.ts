import { getPayload } from "payload";
import config from "@payload-config";
import { findGalleryAsset, galleryAssets } from "@/lib/gallery-assets";
import { defaultMobileLayout, type DesktopGalleryLayout, type MobileGalleryLayout } from "@/lib/gallery-layout";
export { defaultMobileLayout, galleryLayoutClass, galleryMobileClass } from "@/lib/gallery-layout";

export type GalleryPhoto = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  sourceUrl?: string;
  layout: DesktopGalleryLayout;
  fit: "cover" | "contain";
  objectPosition: string;
  mobileLayout: MobileGalleryLayout;
  mobilePosition: string;
  season: "Lato" | "Zima" | "Szkolenia";
};

function staticPhotos(): GalleryPhoto[] {
  return galleryAssets.map((asset) => ({ id: asset.value, src: asset.path, alt: asset.alt, caption: asset.label, layout: asset.layout, fit: asset.fit, objectPosition: asset.position, mobilePosition: asset.position, mobileLayout: defaultMobileLayout(asset.layout), season: asset.season, sourceUrl: asset.value.startsWith("instagram-") ? "https://www.instagram.com/showteam.eu/" : undefined }));
}

function toPhoto(document: Record<string, unknown>): GalleryPhoto | null {
  const media = document.image as { url?: string; alt?: string; focalX?: number; focalY?: number } | number | null | undefined;
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
    alt: String(document.alt || (typeof media === "object" && media?.alt) || fallback?.alt || document.caption || "SHOWteam"),
    caption: String(document.caption || "SHOWteam"),
    sourceUrl: typeof document.sourceUrl === "string" ? document.sourceUrl : undefined,
    layout,
    fit,
    objectPosition,
    mobilePosition,
    mobileLayout: (document.mobileLayout as GalleryPhoto["mobileLayout"]) || defaultMobileLayout(layout),
    season: (document.season as GalleryPhoto["season"]) || fallback?.season || "Lato",
  };
}

export async function getGallery(): Promise<GalleryPhoto[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({ collection: "gallery", where: { published: { equals: true } }, sort: "sortOrder", depth: 1, limit: 100 });
    const photos = result.docs.flatMap((document) => {
      const photo = toPhoto(document as unknown as Record<string, unknown>);
      return photo ? [photo] : [];
    });
    return photos.length ? photos : staticPhotos();
  } catch {
    return staticPhotos();
  }
}
