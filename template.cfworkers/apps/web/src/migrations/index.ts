import * as migration_20260906_121425_initial from './20260906_121425_initial';

export const migrations = [
  {
    up: migration_20260906_121425_initial.up,
    down: migration_20260906_121425_initial.down,
    name: '20260906_121425_initial'
  },
];
