import "server-only";
import { getPayload } from "payload";
import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { pageContentDefaults, type PageContentName, type PageContentValues } from "./page-content-schema";

export type LoadedPageContent<T extends PageContentName> = { id?: string; values: PageContentValues<T> };

const getCachedPageContent = unstable_cache(async (page: PageContentName) => {
  const payload = await getPayload({ config });
  const result = await payload.find({ collection: "page-content", where: { page: { equals: page } }, limit: 1, depth: 0 });
  const document = result.docs[0];
  if (document?.content && typeof document.content === "object" && !Array.isArray(document.content)) {
    return { id: String(document.id), content: document.content as Record<string, string> };
  }
  return {};
}, ["showteam-page-content"], { tags: ["page-content"] });

export async function getPageContent<T extends PageContentName>(page: T): Promise<LoadedPageContent<T>> {
  await connection();
  const document = await getCachedPageContent(page);
  if (document.content) return { id: document.id, values: { ...pageContentDefaults[page], ...document.content } as PageContentValues<T> };
  return { values: { ...pageContentDefaults[page] } as PageContentValues<T> };
}
