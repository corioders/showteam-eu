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

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : "");
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join("payload", "bin.js")));
const isProduction = process.env.NODE_ENV === "production";

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
      views: { calendar: { Component: "@/components/payload/calendar-admin-view#CalendarAdminView", path: "/kalendarz" } },
    },
  },
  collections: [Events, Offers, Gallery, Equipment, createBookingsCollection(database), Analytics, Media, Users],
  i18n: { supportedLanguages: { pl }, fallbackLanguage: "pl" },
  telemetry: false,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "local-showteam-development-secret-change-me",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  plugins: [r2Storage({ bucket: cloudflare.env.R2, collections: { media: true } })],
  onInit: async (payload) => {
    await database.batch([
      database.prepare("CREATE TABLE IF NOT EXISTS booking_slots (equipment_id integer NOT NULL, booking_date text NOT NULL, start_time text NOT NULL, unit_number integer NOT NULL, reservation_id text NOT NULL UNIQUE, PRIMARY KEY (equipment_id, booking_date, start_time, unit_number))"),
      database.prepare("CREATE TABLE IF NOT EXISTS tv_pairings (id text PRIMARY KEY NOT NULL, secret_hash text NOT NULL, user_code text NOT NULL, expires_at integer NOT NULL, approved integer DEFAULT 0 NOT NULL)"),
    ]);
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
