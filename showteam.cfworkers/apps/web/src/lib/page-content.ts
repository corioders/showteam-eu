import "server-only";

import config from "@payload-config";
import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { getPayload } from "payload";

import { type PageContentName, type PageContentValues, pageContentDefaults } from "./page-content-schema";

export type OptimizedMediaReference = { mediaId: number; descriptor: OptimizedImageDescriptor };
export type LoadedPageContent<T extends PageContentName> = { id?: string; media: Record<string, OptimizedMediaReference>; values: PageContentValues<T> };

const getCachedPageContent = unstable_cache(
	async (page: PageContentName) => {
		const payload = await getPayload({ config });
		const result = await payload.find({ collection: "page-content", where: { page: { equals: page } }, limit: 1, depth: 0 });
		const document = result.docs[0];
		if (document?.content && typeof document.content === "object" && !Array.isArray(document.content)) {
			return {
				id: String(document.id),
				content: document.content as Record<string, string>,
				media: document.optimizedMedia && typeof document.optimizedMedia === "object" ? (document.optimizedMedia as Record<string, OptimizedMediaReference>) : {},
			};
		}
		return {};
	},
	["showteam-page-content"],
	{ tags: ["page-content"] },
);

export async function getPageContent<T extends PageContentName>(page: T): Promise<LoadedPageContent<T>> {
	await connection();
	const document = await getCachedPageContent(page);
	if (document.content) {
		return { id: document.id, media: document.media ?? {}, values: { ...pageContentDefaults[page], ...document.content } as PageContentValues<T> };
	}
	return { media: {}, values: { ...pageContentDefaults[page] } as PageContentValues<T> };
}
