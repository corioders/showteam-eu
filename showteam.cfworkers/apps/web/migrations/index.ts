import * as migration20260812224747CmsInitial from "./20260812_224747_cms_initial";
import * as migration20260812232009GalleryCms from "./20260812_232009_gallery_cms";
import * as migration20260813114933GalleryMobileLayout from "./20260813_114933_gallery_mobile_layout";
import * as migration20260813125108EventsAnalytics from "./20260813_125108_events_analytics";
import * as migration20260813140933Reservations from "./20260813_140933_reservations";
import * as migration20260813190000WaterfrontStays from "./20260813_190000_waterfront_stays";
import * as migration20260813193000TvDevices from "./20260813_193000_tv_devices";
import * as migration20260813210000CalendarFeeds from "./20260813_210000_calendar_feeds";
import * as migration20260813214000AvailabilityBlocks from "./20260813_214000_availability_blocks";
import * as migration20260813220000AvailabilityHours from "./20260813_220000_availability_hours";
import * as migration20260814010333Applications from "./20260814_010333_applications";
import * as migration20260814082801 from "./20260814_082801";
import * as migration20260814140904 from "./20260814_140904";
import * as migration20260814142029ParticipantHistory from "./20260814_142029_participant_history";
import * as migration20260814144815GalleryResponsiveImages from "./20260814_144815_gallery_responsive_images";
import * as migration20260814190000GoogleCalendar from "./20260814_190000_google_calendar";
import * as migration20260814210000CopyCleanup from "./20260814_210000_copy_cleanup";
import * as migration20260814220000EquipmentConditions from "./20260814_220000_equipment_conditions";
import * as migration20260815010000WindThresholds from "./20260815_010000_wind_thresholds";
import * as migration20260815230000StructuredOfferDates from "./20260815_230000_structured_offer_dates";
import * as migration20260816100000PageContent from "./20260816_100000_page_content";
import * as migration20260816130000OfferEditorFields from "./20260816_130000_offer_editor_fields";
import * as migration20260816180000RemoveGoogleAndNews from "./20260816_180000_remove_google_and_news";
import * as migration20260816190000Activities from "./20260816_190000_activities";
import * as migration20260816200000StaffEvents from "./20260816_200000_staff_events";
import * as migration20260816210000EventInquiries from "./20260816_210000_event_inquiries";
import * as migration20260816220000ApplicationWorkflow from "./20260816_220000_application_workflow";
import * as migration20260816230000Notifications from "./20260816_230000_notifications";
import * as migration20260816240000StayBookings from "./20260816_240000_stay_bookings";
import * as migration20260816250000BrandingAndOffers from "./20260816_250000_branding_and_offers";
import * as migration20260825230000CstdImages from "./20260825_230000_cstd_images";

export const migrations = [
	{
		up: migration20260812224747CmsInitial.up,
		down: migration20260812224747CmsInitial.down,
		name: "20260812_224747_cms_initial",
	},
	{
		up: migration20260812232009GalleryCms.up,
		down: migration20260812232009GalleryCms.down,
		name: "20260812_232009_gallery_cms",
	},
	{
		up: migration20260813114933GalleryMobileLayout.up,
		down: migration20260813114933GalleryMobileLayout.down,
		name: "20260813_114933_gallery_mobile_layout",
	},
	{
		up: migration20260813125108EventsAnalytics.up,
		down: migration20260813125108EventsAnalytics.down,
		name: "20260813_125108_events_analytics",
	},
	{
		up: migration20260813140933Reservations.up,
		down: migration20260813140933Reservations.down,
		name: "20260813_140933_reservations",
	},
	{
		up: migration20260813190000WaterfrontStays.up,
		down: migration20260813190000WaterfrontStays.down,
		name: "20260813_190000_waterfront_stays",
	},
	{
		up: migration20260813193000TvDevices.up,
		down: migration20260813193000TvDevices.down,
		name: "20260813_193000_tv_devices",
	},
	{
		up: migration20260813210000CalendarFeeds.up,
		down: migration20260813210000CalendarFeeds.down,
		name: "20260813_210000_calendar_feeds",
	},
	{
		up: migration20260813214000AvailabilityBlocks.up,
		down: migration20260813214000AvailabilityBlocks.down,
		name: "20260813_214000_availability_blocks",
	},
	{
		up: migration20260813220000AvailabilityHours.up,
		down: migration20260813220000AvailabilityHours.down,
		name: "20260813_220000_availability_hours",
	},
	{
		up: migration20260814010333Applications.up,
		down: migration20260814010333Applications.down,
		name: "20260814_010333_applications",
	},
	{
		up: migration20260814082801.up,
		down: migration20260814082801.down,
		name: "20260814_082801",
	},
	{
		up: migration20260814140904.up,
		down: migration20260814140904.down,
		name: "20260814_140904",
	},
	{
		up: migration20260814142029ParticipantHistory.up,
		down: migration20260814142029ParticipantHistory.down,
		name: "20260814_142029_participant_history",
	},
	{
		up: migration20260814144815GalleryResponsiveImages.up,
		down: migration20260814144815GalleryResponsiveImages.down,
		name: "20260814_144815_gallery_responsive_images",
	},
	{
		up: migration20260814190000GoogleCalendar.up,
		down: migration20260814190000GoogleCalendar.down,
		name: "20260814_190000_google_calendar",
	},
	{
		up: migration20260814210000CopyCleanup.up,
		down: migration20260814210000CopyCleanup.down,
		name: "20260814_210000_copy_cleanup",
	},
	{
		up: migration20260814220000EquipmentConditions.up,
		down: migration20260814220000EquipmentConditions.down,
		name: "20260814_220000_equipment_conditions",
	},
	{
		up: migration20260815010000WindThresholds.up,
		down: migration20260815010000WindThresholds.down,
		name: "20260815_010000_wind_thresholds",
	},
	{
		up: migration20260815230000StructuredOfferDates.up,
		down: migration20260815230000StructuredOfferDates.down,
		name: "20260815_230000_structured_offer_dates",
	},
	{
		up: migration20260816100000PageContent.up,
		down: migration20260816100000PageContent.down,
		name: "20260816_100000_page_content",
	},
	{
		up: migration20260816130000OfferEditorFields.up,
		down: migration20260816130000OfferEditorFields.down,
		name: "20260816_130000_offer_editor_fields",
	},
	{
		up: migration20260816180000RemoveGoogleAndNews.up,
		down: migration20260816180000RemoveGoogleAndNews.down,
		name: "20260816_180000_remove_google_and_news",
	},
	{
		up: migration20260816190000Activities.up,
		down: migration20260816190000Activities.down,
		name: "20260816_190000_activities",
	},
	{
		up: migration20260816200000StaffEvents.up,
		down: migration20260816200000StaffEvents.down,
		name: "20260816_200000_staff_events",
	},
	{
		up: migration20260816210000EventInquiries.up,
		down: migration20260816210000EventInquiries.down,
		name: "20260816_210000_event_inquiries",
	},
	{
		up: migration20260816220000ApplicationWorkflow.up,
		down: migration20260816220000ApplicationWorkflow.down,
		name: "20260816_220000_application_workflow",
	},
	{
		up: migration20260816230000Notifications.up,
		down: migration20260816230000Notifications.down,
		name: "20260816_230000_notifications",
	},
	{
		up: migration20260816240000StayBookings.up,
		down: migration20260816240000StayBookings.down,
		name: "20260816_240000_stay_bookings",
	},
	{
		up: migration20260816250000BrandingAndOffers.up,
		down: migration20260816250000BrandingAndOffers.down,
		name: "20260816_250000_branding_and_offers",
	},
	{
		up: migration20260825230000CstdImages.up,
		down: migration20260825230000CstdImages.down,
		name: "20260825_230000_cstd_images",
	},
];
