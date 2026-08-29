import "server-only";

import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import { connection } from "next/server";

import { type PageContentName, type PageContentValues, pageContentDefaults } from "./page-content-schema";
import { findDoc } from "./payload-cache";

export type OptimizedMediaReference = { mediaId: number; descriptor: OptimizedImageDescriptor };
export type LoadedPageContent<T extends PageContentName> = { id?: string; media: Record<string, OptimizedMediaReference>; values: PageContentValues<T> };

async function getCachedPageContent<T extends PageContentName>(page: T): Promise<LoadedPageContent<T>> {
	"use cache";
	const document = await findDoc("page-content", { where: { page: { equals: page } }, as: page, depth: 0, overrideAccess: false });
	if (document?.content && typeof document.content === "object" && !Array.isArray(document.content)) {
		return {
			id: String(document.id),
			media: document.optimizedMedia && typeof document.optimizedMedia === "object" ? (document.optimizedMedia as Record<string, OptimizedMediaReference>) : {},
			values: { ...pageContentDefaults[page], ...(document.content as Record<string, string>) } as PageContentValues<T>,
		};
	}
	return { media: {}, values: { ...pageContentDefaults[page] } as PageContentValues<T> };
}

export async function getPageContent<T extends PageContentName>(page: T): Promise<LoadedPageContent<T>> {
	await connection();
	return getCachedPageContent(page);
}
