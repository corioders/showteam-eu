import "server-only";
import { getPayload } from "payload";
import config from "@payload-config";
import { pageContentDefaults, type PageContentName, type PageContentValues } from "./page-content-schema";

export type LoadedPageContent<T extends PageContentName> = { id?: string; values: PageContentValues<T> };

export async function getPageContent<T extends PageContentName>(page: T): Promise<LoadedPageContent<T>> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({ collection: "page-content", where: { page: { equals: page } }, limit: 1, depth: 0 });
    const document = result.docs[0];
    if (document?.content && typeof document.content === "object" && !Array.isArray(document.content)) {
      return { id: String(document.id), values: { ...pageContentDefaults[page], ...document.content } as PageContentValues<T> };
    }
  } catch {
    // Production builds do not have remote D1 bindings. Defaults become the first editable version.
  }
  return { values: { ...pageContentDefaults[page] } as PageContentValues<T> };
}
