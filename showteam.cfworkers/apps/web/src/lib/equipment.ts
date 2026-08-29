import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import { connection } from "next/server";

import { findDocByID, findIds } from "@/lib/payload-cache";
import type { BookableEquipment } from "@/lib/reservations";

async function getBookableEquipmentIds() {
	"use cache";
	return (
		await findIds("equipment", {
			where: { active: { equals: true } },
			sort: "sortOrder",
			limit: 100,
			list: "bookable",
			overrideAccess: false,
		})
	).ids;
}

async function getBookableEquipmentById(id: string | number): Promise<BookableEquipment | null> {
	"use cache";
	const document = await findDocByID("equipment", id, { depth: 1, overrideAccess: false });
	return document
		? {
				id: Number(document.id),
				name: document.name,
				description: document.description,
				category: document.category,
				quantity: document.quantity,
				durationMinutes: document.durationMinutes,
				openTime: document.openTime,
				closeTime: document.closeTime,
				unavailableWeekends: Boolean(document.unavailableWeekends),
				sharedResourceKey: document.sharedResourceKey || undefined,
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
				image:
					typeof document.image === "object" && document.image
						? { ...document.image, optimizedImage: document.image.optimizedImage as OptimizedImageDescriptor | null | undefined }
						: document.image || null,
				sortOrder: document.sortOrder,
			}
		: null;
}

export async function getBookableEquipment(): Promise<BookableEquipment[]> {
	await connection();
	const equipment: BookableEquipment[] = [];
	for (const id of await getBookableEquipmentIds()) {
		const item = await getBookableEquipmentById(id);
		if (item) {
			equipment.push(item);
		}
	}
	return equipment;
}
