// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import { CollectionCards as CollectionCardsF9c02e79a4aed9a3924487c0cd4cafb1 } from "@payloadcms/next/rsc";
import { R2ClientUploadHandler as R2ClientUploadHandler85cc02ed84006fcc91d3aff39dda669d } from "@payloadcms/storage-r2/client";

import { AdvancedAdminView as AdvancedAdminView9c973047fdc7ca2d750b2e2dfa8f0c6a } from "@/components/payload/advanced-admin-view";
import { ApplicationsAdminView as ApplicationsAdminView1d1aec5f14ad22e0e686223d9022d0a4 } from "@/components/payload/applications-admin-view";
import { BackToPanel as BackToPanelA454473be4ce7abecbf4cef2a56621b6 } from "@/components/payload/back-to-panel";
import {
	LoginIntro as LoginIntro3db7ad225bd85fd7c2b1c1cf21568361,
	ShowteamIcon as ShowteamIcon3db7ad225bd85fd7c2b1c1cf21568361,
	ShowteamLogo as ShowteamLogo3db7ad225bd85fd7c2b1c1cf21568361,
} from "@/components/payload/brand";
import { CalendarAdminView as CalendarAdminViewDcda57cf67ab4f07c23f876e5b43fe3d } from "@/components/payload/calendar-admin-view";
import { DashboardRedirect as DashboardRedirect8e1ae8668b207d648d187c60c8a9ccb4 } from "@/components/payload/dashboard-redirect";
import { FormDraftPersistence as FormDraftPersistence96dc89a0d7977db3474e3c5ed4ef296e } from "@/components/payload/form-draft-persistence";
import { LogoutButton as LogoutButton1f50293d18f67150ff884c3ad0e5ded9 } from "@/components/payload/logout-button";
import { QuickUploadCard as QuickUploadCard9a11b25b22cf5ee26358b6f84a63723a } from "@/components/payload/quick-upload-card";
import { StatisticsAdminView as StatisticsAdminViewFc0450413d7b4e318d65a16ec9935cfd } from "@/components/payload/statistics-admin-view";
import { TvDevicesAdminView as TvDevicesAdminView18f2b77816a329d86e7eb14e3c4c6910 } from "@/components/payload/tv-devices-admin-view";

/** @type import('payload').ImportMap */
export const importMap = {
	"@/components/payload/form-draft-persistence#FormDraftPersistence": FormDraftPersistence96dc89a0d7977db3474e3c5ed4ef296e,
	"@/components/payload/back-to-panel#BackToPanel": BackToPanelA454473be4ce7abecbf4cef2a56621b6,
	"@/components/payload/logout-button#LogoutButton": LogoutButton1f50293d18f67150ff884c3ad0e5ded9,
	"@/components/payload/brand#ShowteamIcon": ShowteamIcon3db7ad225bd85fd7c2b1c1cf21568361,
	"@/components/payload/brand#ShowteamLogo": ShowteamLogo3db7ad225bd85fd7c2b1c1cf21568361,
	"@/components/payload/quick-upload-card#QuickUploadCard": QuickUploadCard9a11b25b22cf5ee26358b6f84a63723a,
	"@/components/payload/brand#LoginIntro": LoginIntro3db7ad225bd85fd7c2b1c1cf21568361,
	"@payloadcms/storage-r2/client#R2ClientUploadHandler": R2ClientUploadHandler85cc02ed84006fcc91d3aff39dda669d,
	"@/components/payload/dashboard-redirect#DashboardRedirect": DashboardRedirect8e1ae8668b207d648d187c60c8a9ccb4,
	"@/components/payload/advanced-admin-view#AdvancedAdminView": AdvancedAdminView9c973047fdc7ca2d750b2e2dfa8f0c6a,
	"@/components/payload/calendar-admin-view#CalendarAdminView": CalendarAdminViewDcda57cf67ab4f07c23f876e5b43fe3d,
	"@/components/payload/applications-admin-view#ApplicationsAdminView": ApplicationsAdminView1d1aec5f14ad22e0e686223d9022d0a4,
	"@/components/payload/statistics-admin-view#StatisticsAdminView": StatisticsAdminViewFc0450413d7b4e318d65a16ec9935cfd,
	"@/components/payload/tv-devices-admin-view#TvDevicesAdminView": TvDevicesAdminView18f2b77816a329d86e7eb14e3c4c6910,
	"@payloadcms/next/rsc#CollectionCards": CollectionCardsF9c02e79a4aed9a3924487c0cd4cafb1,
};
