import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

const openNextConfig = defineCloudflareConfig({ incrementalCache: r2IncrementalCache, tagCache: d1NextTagCache });
openNextConfig.packageJsonPath = "../../";

// biome-ignore lint/style/noDefaultExport: OpenNext requires a default config export.
export default openNextConfig;
