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
    name: '20260814_142029_participant_history'
  },
];
