import type { Payload } from "payload";

import type { EditableEquipment } from "@/lib/editor-equipment";

export function equipmentMutationData(data: EditableEquipment) {
	return {
		...data,
		notice: data.notice || null,
		recommendedStart1: data.recommendedStart1 || null,
		recommendedEnd1: data.recommendedEnd1 || null,
		recommendedStart2: data.recommendedStart2 || null,
		recommendedEnd2: data.recommendedEnd2 || null,
		professionalWindMinKmh: data.professionalWindMinKmh,
		recommendationNote: data.recommendationNote || null,
	};
}

export async function nextEquipmentSortOrder(payload: Payload) {
	const result = await payload.find({ collection: "equipment", sort: "-sortOrder", limit: 1, overrideAccess: true });
	return (result.docs[0]?.sortOrder ?? 0) + 10;
}
