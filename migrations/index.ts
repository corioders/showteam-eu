import * as migration_20260812_224747_cms_initial from './20260812_224747_cms_initial';
import * as migration_20260812_232009_gallery_cms from './20260812_232009_gallery_cms';
import * as migration_20260813_114933_gallery_mobile_layout from './20260813_114933_gallery_mobile_layout';

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
    name: '20260813_114933_gallery_mobile_layout'
  },
];
