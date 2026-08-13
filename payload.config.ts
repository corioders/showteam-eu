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
import { createBookingsCollection } from "@/collections/Bookings";
import { Equipment } from "@/collections/Equipment";
import { Events } from "@/collections/Events";
import type { GetPlatformProxyOptions } from "wrangler";
import { Media } from "@/collections/Media";
import { Gallery } from "@/collections/Gallery";
import { Offers } from "@/collections/Offers";
import { Users } from "@/collections/Users";
import { seedOffers } from "@/lib/seed-offers";
import { seedGallery } from "@/lib/seed-gallery";
import { seedEvents } from "@/lib/events";
import { seedEquipment } from "@/lib/seed-equipment";
import { preserveOperationalTables } from "@/lib/operational-schema";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : "");
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join("payload", "bin.js")));
const isProduction = process.env.NODE_ENV === "production";
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";

const cloudflare = isCLI || !isProduction
  ? await getCloudflareContextFromWrangler()
  : await getCloudflareContext({ async: true });

export const database = cloudflare.env.D1;

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: " — Panel SHOWteam" },
    components: {
      beforeDashboard: ["@/components/payload/quick-upload-card#QuickUploadCard"],
      beforeLogin: ["@/components/payload/brand#LoginIntro"],
      graphics: { Logo: "@/components/payload/brand#ShowteamLogo", Icon: "@/components/payload/brand#ShowteamIcon" },
      views: { calendar: { Component: "@/components/payload/calendar-admin-view#CalendarAdminView", path: "/kalendarz" } },
    },
  },
  collections: [Events, Offers, Gallery, Equipment, createBookingsCollection(database), Analytics, Media, Users],
  i18n: { supportedLanguages: { pl }, fallbackLanguage: "pl" },
  telemetry: false,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "local-showteam-development-secret-change-me",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1, afterSchemaInit: [preserveOperationalTables] }),
  plugins: [r2Storage({ bucket: cloudflare.env.R2, collections: { media: true } })],
  onInit: async (payload) => {
    if (isNextBuild) return;
    await seedOffers(payload);
    await seedGallery(payload);
    await seedEvents(payload);
    await seedEquipment(payload);
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
