import config from "@payload-config";
import { createCacheHelpers } from "@pro-laico/payload-revalidate/cache";
import { getPayload } from "payload";

export const { findDoc, findDocByID, findIds } = createCacheHelpers(getPayload({ config }));
