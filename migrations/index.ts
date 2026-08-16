import * as migration_20260812_224747_cms_initial from './20260812_224747_cms_initial';
import * as migration_20260812_232009_gallery_cms from './20260812_232009_gallery_cms';
import * as migration_20260813_114933_gallery_mobile_layout from './20260813_114933_gallery_mobile_layout';
import * as migration_20260813_125108_events_analytics from './20260813_125108_events_analytics';
import * as migration_20260813_140933_reservations from './20260813_140933_reservations';
import * as migration_20260813_190000_waterfront_stays from './20260813_190000_waterfront_stays';
import * as migration_20260813_193000_tv_devices from './20260813_193000_tv_devices';
import * as migration_20260813_210000_calendar_feeds from './20260813_210000_calendar_feeds';
import * as migration_20260813_214000_availability_blocks from './20260813_214000_availability_blocks';
import * as migration_20260813_220000_availability_hours from './20260813_220000_availability_hours';
import * as migration_20260814_010333_applications from './20260814_010333_applications';
import * as migration_20260814_082801 from './20260814_082801';
import * as migration_20260814_140904 from './20260814_140904';
import * as migration_20260814_142029_participant_history from './20260814_142029_participant_history';
import * as migration_20260814_144815_gallery_responsive_images from './20260814_144815_gallery_responsive_images';
import * as migration_20260814_190000_google_calendar from './20260814_190000_google_calendar';
import * as migration_20260814_210000_copy_cleanup from './20260814_210000_copy_cleanup';
import * as migration_20260814_220000_equipment_conditions from './20260814_220000_equipment_conditions';
import * as migration_20260815_010000_wind_thresholds from './20260815_010000_wind_thresholds';
import * as migration_20260815_230000_structured_offer_dates from './20260815_230000_structured_offer_dates';
import * as migration_20260816_100000_page_content from './20260816_100000_page_content';
import * as migration_20260816_130000_offer_editor_fields from './20260816_130000_offer_editor_fields';
import * as migration_20260816_180000_remove_google_and_news from './20260816_180000_remove_google_and_news';
import * as migration_20260816_190000_activities from './20260816_190000_activities';

export const migrations = [
  {
    up: migration_20260812_224747_cms_initial.up,
    down: migration_20260812_224747_cms_initial.down,
    name: '20260812_224747_cms_initial',
  },
  {
    up: migration_20260812_232009_gallery_cms.up,
    down: migration_20260812_232009_gallery_cms.down,
    name: '20260812_232009_gallery_cms',
  },
  {
    up: migration_20260813_114933_gallery_mobile_layout.up,
    down: migration_20260813_114933_gallery_mobile_layout.down,
    name: '20260813_114933_gallery_mobile_layout',
  },
  {
    up: migration_20260813_125108_events_analytics.up,
    down: migration_20260813_125108_events_analytics.down,
    name: '20260813_125108_events_analytics',
  },
  {
    up: migration_20260813_140933_reservations.up,
    down: migration_20260813_140933_reservations.down,
    name: '20260813_140933_reservations',
  },
  {
    up: migration_20260813_190000_waterfront_stays.up,
    down: migration_20260813_190000_waterfront_stays.down,
    name: '20260813_190000_waterfront_stays',
  },
  {
    up: migration_20260813_193000_tv_devices.up,
    down: migration_20260813_193000_tv_devices.down,
    name: '20260813_193000_tv_devices',
  },
  {
    up: migration_20260813_210000_calendar_feeds.up,
    down: migration_20260813_210000_calendar_feeds.down,
    name: '20260813_210000_calendar_feeds',
  },
  {
    up: migration_20260813_214000_availability_blocks.up,
    down: migration_20260813_214000_availability_blocks.down,
    name: '20260813_214000_availability_blocks',
  },
  {
    up: migration_20260813_220000_availability_hours.up,
    down: migration_20260813_220000_availability_hours.down,
    name: '20260813_220000_availability_hours',
  },
  {
    up: migration_20260814_010333_applications.up,
    down: migration_20260814_010333_applications.down,
    name: '20260814_010333_applications',
  },
  {
    up: migration_20260814_082801.up,
    down: migration_20260814_082801.down,
    name: '20260814_082801',
  },
  {
    up: migration_20260814_140904.up,
    down: migration_20260814_140904.down,
    name: '20260814_140904',
  },
  {
    up: migration_20260814_142029_participant_history.up,
    down: migration_20260814_142029_participant_history.down,
    name: '20260814_142029_participant_history',
  },
  {
    up: migration_20260814_144815_gallery_responsive_images.up,
    down: migration_20260814_144815_gallery_responsive_images.down,
    name: '20260814_144815_gallery_responsive_images'
  },
  {
    up: migration_20260814_190000_google_calendar.up,
    down: migration_20260814_190000_google_calendar.down,
    name: '20260814_190000_google_calendar'
  },
  {
    up: migration_20260814_210000_copy_cleanup.up,
    down: migration_20260814_210000_copy_cleanup.down,
    name: '20260814_210000_copy_cleanup'
  },
  {
    up: migration_20260814_220000_equipment_conditions.up,
    down: migration_20260814_220000_equipment_conditions.down,
    name: '20260814_220000_equipment_conditions'
  },
  {
    up: migration_20260815_010000_wind_thresholds.up,
    down: migration_20260815_010000_wind_thresholds.down,
    name: '20260815_010000_wind_thresholds'
  },
  {
    up: migration_20260815_230000_structured_offer_dates.up,
    down: migration_20260815_230000_structured_offer_dates.down,
    name: '20260815_230000_structured_offer_dates'
  },
  {
    up: migration_20260816_100000_page_content.up,
    down: migration_20260816_100000_page_content.down,
    name: '20260816_100000_page_content'
  },
  {
    up: migration_20260816_130000_offer_editor_fields.up,
    down: migration_20260816_130000_offer_editor_fields.down,
    name: '20260816_130000_offer_editor_fields'
  },
  {
    up: migration_20260816_180000_remove_google_and_news.up,
    down: migration_20260816_180000_remove_google_and_news.down,
    name: '20260816_180000_remove_google_and_news'
  },
  {
    up: migration_20260816_190000_activities.up,
    down: migration_20260816_190000_activities.down,
    name: '20260816_190000_activities'
  },
];
