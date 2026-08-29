import type { Data } from "payload";

const DRAFT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export type CmsDraft = {
	data: Data;
	savedAt: number;
	version: 1;
};

export function cmsDraftKey(collection: string, id?: number | string) {
	return `showteam:cms-draft:${collection}:${id ?? "new"}`;
}

export function cmsDraftData(collection: string, data: Data): Data {
	if (collection !== "bookings") {
		return data;
	}
	return { staffNotes: data.staffNotes, status: data.status };
}

export function parseCmsDraft(raw: string | null, now = Date.now()): CmsDraft | null {
	if (!raw) {
		return null;
	}

	try {
		const draft = JSON.parse(raw) as Partial<CmsDraft>;
		const validData = draft.data && typeof draft.data === "object" && !Array.isArray(draft.data);
		const validDate = typeof draft.savedAt === "number" && now - draft.savedAt <= DRAFT_LIFETIME_MS;
		return draft.version === 1 && validData && validDate ? (draft as CmsDraft) : null;
	} catch {
		return null;
	}
}
