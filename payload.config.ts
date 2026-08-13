import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getCloudflareContext, type CloudflareContext } from "@opennextjs/cloudflare";
import { sqliteD1Adapter } from "@payloadcms/db-d1-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { r2Storage } from "@payloadcms/storage-r2";
import { buildConfig } from "payload";
import { pl } from "@payloadcms/translations/languages/pl";
import { Analytics } from "@/collections/Analytics";
import { Events } from "@/collections/Events";
import type { GetPlatformProxyOptions } from "wrangler";
import { Media } from "@/collections/Media";
import { Gallery } from "@/collections/Gallery";
import { Offers } from "@/collections/Offers";
import { Users } from "@/collections/Users";
import { seedOffers } from "@/lib/seed-offers";
import { seedGallery } from "@/lib/seed-gallery";
import { seedEvents } from "@/lib/events";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : "");
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join("payload", "bin.js")));
const isProduction = process.env.NODE_ENV === "production";

const cloudflare = isCLI || !isProduction
  ? await getCloudflareContextFromWrangler()
  : await getCloudflareContext({ async: true });

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: " — Panel SHOWteam" },
  },
  collections: [Events, Offers, Gallery, Analytics, Media, Users],
  i18n: { supportedLanguages: { pl }, fallbackLanguage: "pl" },
  telemetry: false,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "local-showteam-development-secret-change-me",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  plugins: [r2Storage({ bucket: cloudflare.env.R2, collections: { media: true } })],
  onInit: async (payload) => {
    await seedOffers(payload);
    await seedGallery(payload);
    await seedEvents(payload);
  },
});

function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${"__wrangler".replaceAll("_", "")}`).then(
    ({ getPlatformProxy }) => getPlatformProxy({
      environment: process.env.CLOUDFLARE_ENV,
      remoteBindings: isProduction && Boolean(process.env.CLOUDFLARE_API_TOKEN),
    } satisfies GetPlatformProxyOptions),
  );
}
