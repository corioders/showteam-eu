// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and test environment variables are runtime bindings.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type CloudflareContext, getCloudflareContext } from "@opennextjs/cloudflare";
import { sqliteD1Adapter } from "@payloadcms/db-d1-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { r2Storage } from "@payloadcms/storage-r2";
import { pl } from "@payloadcms/translations/languages/pl";
import { buildConfig } from "payload";
import type { GetPlatformProxyOptions } from "wrangler";

import { Analytics } from "@/collections/Analytics";
import { Applications } from "@/collections/Applications";
import { createBookingsCollection } from "@/collections/Bookings";
import { Equipment } from "@/collections/Equipment";
import { EventInquiries } from "@/collections/EventInquiries";
import { Gallery } from "@/collections/Gallery";
import { Media } from "@/collections/Media";
import { Offers } from "@/collections/Offers";
import { PageContent } from "@/collections/PageContent";
import { StayBookings } from "@/collections/StayBookings";
import { Users } from "@/collections/Users";
import { EventSettings } from "@/globals/EventSettings";
import { preserveOperationalTables } from "@/lib/operational-schema";
import { seedEquipment } from "@/lib/seed-equipment";
import { seedGallery } from "@/lib/seed-gallery";
import { seedOffers } from "@/lib/seed-offers";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : "");
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join("payload", "bin.js")) || value.endsWith("seed-ci.ts"));
const isProduction = process.env.NODE_ENV === "production";
const isCI = process.env.CI === "true";
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";
const payloadSecret = process.env.PAYLOAD_SECRET ?? (!isProduction || isNextBuild ? "local-showteam-development-secret-change-me" : undefined);

if (!payloadSecret) {
	throw new Error("Brak PAYLOAD_SECRET. Ustaw sekret przed uruchomieniem aplikacji produkcyjnej.");
}
const showteamPolish = {
	...pl,
	translations: {
		...pl.translations,
		general: {
			...pl.translations.general,
			createNew: "Dodaj",
			createNewLabel: "Dodaj: {{label}}",
			creatingNewLabel: "Dodajesz: {{label}}",
			untitled: "Nowy wpis",
		},
	},
};

const cloudflare: CloudflareContext & { dispose?: () => Promise<void> } =
	isCLI || !isProduction ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });

export const database = cloudflare.env.D1;
export const mediaBucket = cloudflare.env.R2;
export const disposeCloudflareContext = cloudflare.dispose?.bind(cloudflare);

// ponytail: Payload 3.88 generates `DELETE ... WHERE false` while cleaning
// polymorphic document locks on D1. Re-enable locks after the adapter fixes it.
const collections = [
	Offers,
	Gallery,
	PageContent,
	Equipment,
	createBookingsCollection(database),
	StayBookings,
	Applications,
	EventInquiries,
	Analytics,
	Media,
	Users,
].map((collection) => ({ ...collection, lockDocuments: false as const }));

export default buildConfig({
	admin: {
		user: Users.slug,
		importMap: { baseDir: dirname },
		meta: {
			titleSuffix: " — Panel SHOWteam",
			manifest: "/admin.webmanifest",
			appleWebApp: { capable: true, statusBarStyle: "default", title: "SHOWteam" },
			icons: { apple: "/pwa-192.png", icon: "/favicon.ico" },
		},
		components: {
			header: ["@/components/payload/back-to-panel#BackToPanel"],
			beforeDashboard: ["@/components/payload/quick-upload-card#QuickUploadCard"],
			beforeLogin: ["@/components/payload/brand#LoginIntro"],
			logout: { Button: "@/components/payload/logout-button#LogoutButton" },
			graphics: { Logo: "@/components/payload/brand#ShowteamLogo", Icon: "@/components/payload/brand#ShowteamIcon" },
			views: {
				dashboard: { Component: "@/components/payload/dashboard-redirect#DashboardRedirect", path: "/" },
				advanced: { Component: "@/components/payload/advanced-admin-view#AdvancedAdminView", path: "/zaawansowane" },
				calendar: { Component: "@/components/payload/calendar-admin-view#CalendarAdminView", path: "/kalendarz" },
				applications: { Component: "@/components/payload/applications-admin-view#ApplicationsAdminView", path: "/zgloszenia" },
				statistics: { Component: "@/components/payload/statistics-admin-view#StatisticsAdminView", path: "/statystyki" },
				televisions: { Component: "@/components/payload/tv-devices-admin-view#TvDevicesAdminView", path: "/telewizory" },
			},
		},
	},
	collections,
	globals: [{ ...EventSettings, lockDocuments: false }],
	i18n: { supportedLanguages: { pl: showteamPolish }, fallbackLanguage: "pl" },
	telemetry: false,
	graphQL: { disable: true },
	editor: lexicalEditor(),
	secret: payloadSecret,
	typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
	db: sqliteD1Adapter({ binding: cloudflare.env.D1, afterSchemaInit: [preserveOperationalTables], push: false }),
	plugins: [r2Storage({ bucket: cloudflare.env.R2, collections: { media: true } })],
	onInit:
		isProduction || isCI
			? undefined
			: async (payload) => {
					await seedOffers(payload);
					await seedGallery(payload);
					await seedEquipment(payload);
				},
});

function getCloudflareContextFromWrangler(): Promise<CloudflareContext & { dispose?: () => Promise<void> }> {
	return import(/* webpackIgnore: true */ `${"__wrangler".replaceAll("_", "")}`).then(({ getPlatformProxy }) =>
		getPlatformProxy({
			environment: process.env.CLOUDFLARE_ENV,
			configPath: process.env.CLOUDFLARE_REMOTE_BINDINGS === "true" ? path.resolve(dirname, "wrangler.migrations.jsonc") : undefined,
			persist: process.env.CSTD_D1_PERSIST_PATH ? { path: process.env.CSTD_D1_PERSIST_PATH } : undefined,
			remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === "true",
		} satisfies GetPlatformProxyOptions),
	);
}
