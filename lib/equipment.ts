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
    image: document.image || null,
  }));
}
