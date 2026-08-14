import { getPayload } from "payload";
import config from "@payload-config";
import type { BookableEquipment } from "@/lib/reservations";

export async function getBookableEquipment(): Promise<BookableEquipment[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "equipment",
    where: { active: { equals: true } },
    sort: "sortOrder",
    depth: 1,
    limit: 100,
    overrideAccess: false,
  });
  return result.docs.map((document) => ({
    id: Number(document.id),
    name: document.name,
    description: document.description,
    category: document.category,
    quantity: document.quantity,
    durationMinutes: document.durationMinutes,
    openTime: document.openTime,
    closeTime: document.closeTime,
    notice: document.notice || undefined,
    weatherProfile: document.weatherProfile,
    recommendedStart1: document.recommendedStart1 || undefined,
    recommendedEnd1: document.recommendedEnd1 || undefined,
    recommendedStart2: document.recommendedStart2 || undefined,
    recommendedEnd2: document.recommendedEnd2 || undefined,
    windMediumMinKmh: document.windMediumMinKmh,
    windMediumMaxKmh: document.windMediumMaxKmh,
    windBestMinKmh: document.windBestMinKmh,
    windBestMaxKmh: document.windBestMaxKmh,
    professionalWindMinKmh: document.professionalWindMinKmh ?? undefined,
    recommendationNote: document.recommendationNote || undefined,
    image: document.image || null,
  }));
}
