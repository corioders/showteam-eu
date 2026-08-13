import type { Payload } from "payload";
import { galleryAssets } from "@/lib/gallery-assets";
import { defaultMobileLayout } from "@/lib/gallery-layout";

export async function seedGallery(payload: Payload) {
  const existing = await payload.count({ collection: "gallery" });
  if (existing.totalDocs > 0) return;

  for (const [index, asset] of galleryAssets.entries()) {
    await payload.create({
      collection: "gallery",
      data: {
        staticImage: asset.value,
        caption: asset.label,
        alt: asset.alt,
        season: asset.season,
        layout: asset.layout,
        mobileLayout: defaultMobileLayout(asset.layout),
        mobilePosition: "same",
        fit: asset.fit,
        sortOrder: (index + 1) * 10,
        published: true,
        sourceUrl: index >= 9 ? "https://www.instagram.com/showteam.eu/" : undefined,
      } as never,
    });
  }
}
