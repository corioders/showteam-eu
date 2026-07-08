// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { createStorage, type Driver, defineDriver } from "unstorage";
import lruCacheDriver from "unstorage/drivers/lru-cache";

export interface CacheDriverOptions {
	driver: Driver;
	cacheDriver?: Driver;
}

// biome-ignore lint/style/noDefaultExport: This is unstorage pattern
export default defineDriver<CacheDriverOptions, CacheDriverOptions["driver"]>((opts: CacheDriverOptions) => {
	// TODO remove the Required conversion
	const baseDriver = opts.driver as Required<Driver>;
	const cache = createStorage({ driver: opts.cacheDriver ?? lruCacheDriver({}) });

	return {
		...baseDriver,
		async getItem(key, opts) {
			let value = await cache.getItem(key, opts);
			if (value !== null) {
				return value;
			}

			value = await baseDriver.getItem(key, opts);
			await cache.setItem(key, value);

			return value;
		},
		async getItemRaw(key, opts) {
			let value = await cache.getItemRaw(key, opts);
			if (value !== null) {
				return value;
			}

			value = await baseDriver.getItemRaw(key, opts);
			await cache.setItemRaw(key, value);

			return value;
		},
		async hasItem(key, opts) {
			if (await cache.hasItem(key, opts)) {
				return true;
			}

			return baseDriver.hasItem(key, opts);
		},
		async removeItem(key, opts) {
			await cache.removeItem(key, opts);
			await baseDriver.removeItem(key, opts);
		},
		async setItem(key, value, opts) {
			await Promise.all([baseDriver.setItem(key, value, opts), cache.setItem(key, value, opts)]);
		},
		async setItemRaw(key, value, opts) {
			await Promise.all([baseDriver.setItemRaw(key, value, opts), cache.setItemRaw(key, value, opts)]);
		},
	};
});
