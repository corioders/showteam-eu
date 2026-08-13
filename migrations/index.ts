import * as migration_20260812_224747_cms_initial from './20260812_224747_cms_initial';
import * as migration_20260812_232009_gallery_cms from './20260812_232009_gallery_cms';
import * as migration_20260813_114933_gallery_mobile_layout from './20260813_114933_gallery_mobile_layout';
import * as migration_20260813_125108_events_analytics from './20260813_125108_events_analytics';
import * as migration_20260813_140933_reservations from './20260813_140933_reservations';
import * as migration_20260813_190000_waterfront_stays from './20260813_190000_waterfront_stays';

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
    name: '20260813_140933_reservations'
  },
  {
    up: migration_20260813_190000_waterfront_stays.up,
    down: migration_20260813_190000_waterfront_stays.down,
    name: '20260813_190000_waterfront_stays'
  },
];
