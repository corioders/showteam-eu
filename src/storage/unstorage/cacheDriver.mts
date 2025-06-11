// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { type Driver, createStorage, defineDriver } from 'unstorage';
import lruCacheDriver from 'unstorage/drivers/lru-cache';

export interface CacheDriverOptions {
	driver: Driver;
	cacheDriver?: Driver;
}

export default defineDriver<CacheDriverOptions, CacheDriverOptions['driver']>((opts: CacheDriverOptions) => {
	// TODO remove the Required conversion
	const baseDriver = opts.driver as Required<Driver>;
	const cache = createStorage({ driver: opts.cacheDriver ?? lruCacheDriver(undefined) });

	return {
		...baseDriver,
		async hasItem(key, opts) {
			if (await cache.hasItem(key, opts)) {
				return true;
			}

			return baseDriver.hasItem(key, opts);
		},
		async setItem(key, value, opts) {
			await Promise.all([baseDriver.setItem(key, value, opts), cache.setItem(key, value, opts)]);
		},
		async getItem(key, opts) {
			let value = await cache.getItem(key, opts);
			if (value !== null) {
				return value;
			}

			value = await baseDriver.getItem(key, opts);
			cache.setItem(key, value);

			return value;
		},
		async setItemRaw(key, value, opts) {
			await Promise.all([baseDriver.setItemRaw(key, value, opts), cache.setItemRaw(key, value, opts)]);
		},
		async getItemRaw(key, opts) {
			let value = await cache.getItemRaw(key, opts);
			if (value !== null) {
				return value;
			}

			value = await baseDriver.getItemRaw(key, opts);
			cache.setItemRaw(key, value);

			return value;
		},
	};
});
