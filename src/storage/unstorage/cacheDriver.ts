import { type Driver, createStorage, defineDriver } from 'unstorage';
import lruCacheDriver from 'unstorage/drivers/lru-cache';

export interface CacheDriverOptions {
	driver: Driver;
	cacheDriver?: Driver;
}

export default defineDriver<CacheDriverOptions, CacheDriverOptions['driver']>((opts: CacheDriverOptions) => {
	const baseDriver = opts.driver;
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
	};
});
