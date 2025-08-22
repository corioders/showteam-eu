// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

/** biome-ignore-all lint/style/useNamingConvention: This file does a lot of global shenanigans, we need to use our names */

import { createHash } from "node:crypto";

import { GoogleAuth } from "googleapis-common";
import memoize from "memoize";
import { createStorage, type Storage as UnstorageStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs-lite";

import { CORIODERS_INVALIDATE_PERSISTENT_CACHE } from "@/const.js";
import { type ErrorReturnPromise, safePromise } from "@/error/index.js";
import type { JsonValue } from "@/format/json/index.js";
import { stringToURLSafeString } from "@/net/url.js";
import cacheDriver from "@/storage/unstorage/cache-driver.mjs";

type AnyFunction = (...arguments_: readonly any[]) => any;

interface OurGlobalThis {
	__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE?: Map<any, any>;

	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE?: UnstorageStorage;
	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_MAP?: Map<CacheKey, boolean>;
	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP?: Map<CacheKey, boolean>;
	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS?: Map<CacheKey, Promise<unknown>>;
}
const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE = new Map();
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE = createStorage({
		// We don't need to use cacheDriver because every function should be also memorized. This is because
		// every function call EVEN IF using persistent cache costs us one fetch call to check if the resource has changed.
		driver: cacheDriver({ driver: fsDriver({ base: ".next/cache/corioders/cstd-ts-driveCMS-persistent" }) }),
		// driver: fsDriver({ base: '.next/cache/corioders/cstd-ts-driveCMS-persistent' }),
	});
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_MAP) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_MAP = new Map();
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP = new Map();
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS = new Map();
}

const persistentCache = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE;
const persistentCacheInvalidationMap = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_MAP;
const persistentCacheDisableAutomaticInvalidationMap = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP;
const persistentCacheDebounceFunctionCalls = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS;

const memoizeCache = ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE;

function driveCMSCacheKey(functionArguments: readonly unknown[]) {
	let key = "";
	for (const argument of functionArguments) {
		const argumentType = typeof argument;

		if (argumentType === "string") {
			key += argument;
			continue;
		}

		if (argumentType === "number" || argumentType === "boolean") {
			key += String(argument);
			continue;
		}

		if (argument instanceof GoogleAuth) {
			key += JSON.stringify(argument.jsonContent);
			continue;
		}

		if (argument === undefined) {
			key += String(argument);
			continue;
		}

		if (argumentType === "object") {
			key += JSON.stringify(argument);
			continue;
		}

		throw new Error(`Unsupported memorize argument type: ${argumentType}, ${argument}`);
	}

	return key;
}

export const REMOVE_PERSISTENT_CACHE_VALUE = Symbol("INVALIDATE_PERSISTENT_CACHE");
export interface PersistentCacheController<CachedValueT extends JsonValue> {
	getCachedValue(): ErrorReturnPromise<CachedValueT>;
	setCachedValue(value: CachedValueT | typeof REMOVE_PERSISTENT_CACHE_VALUE): Promise<Error | null>;

	// disableAutomaticInvalidation allows for more optimal (manual) invalidation strategies.
	// For example. List folder must be invalidated automatically, but downloadDoc has more efficient manual invalidation strategy.
	disableAutomaticInvalidation(): void;
}

export interface PersistentCacheControllerThis<CachedValueT extends JsonValue> {
	persistentCacheController: PersistentCacheController<CachedValueT>;
}

type CacheKey = string & { readonly __cacheKeyTag: unique symbol };

export function invalidate() {
	memoizeCache.clear();

	for (const cacheKey of persistentCacheInvalidationMap.keys()) {
		persistentCacheInvalidationMap.set(cacheKey, true);
	}

	for (const cacheKey of persistentCacheDebounceFunctionCalls.keys()) {
		persistentCacheDebounceFunctionCalls.delete(cacheKey);
	}

	for (const cacheKey of persistentCacheDebounceFunctionCalls.keys()) {
		persistentCacheDebounceFunctionCalls.delete(cacheKey);
	}
}

function getInvalidationFlag(cacheKey: CacheKey): boolean {
	if (CORIODERS_INVALIDATE_PERSISTENT_CACHE) {
		// TLDR: We don't just return true because, it leads to duplicate invalidation.
		//
		// Lets assume that here we just: return true;
		// When listFolder(1) is called, the persistent cache is cleared because getInvalidationFlag return true, it's cached and we continue with out life.
		// When listFolder(1) is called again the persistent cache is cleared AGAIN because getInvalidationFlag return true, even though we already have the latest data.
		// We must take into account persistentCacheInvalidationMap state.
		return persistentCacheInvalidationMap.get(cacheKey) ?? true;
	}

	return persistentCacheInvalidationMap.get(cacheKey) ?? false;
}

export function persistentDriveCMSCache<CachedValueT extends JsonValue, FunctionToCacheArguments extends any[] = unknown[], FunctionToCacheReturn = unknown>(
	cacheNamePreferablyFunctionName: string,
	fn: (persistentCacheController: PersistentCacheController<CachedValueT>, ..._arguments: FunctionToCacheArguments) => Promise<FunctionToCacheReturn>,
): (..._arguments: FunctionToCacheArguments) => Promise<FunctionToCacheReturn> {
	async function persistentCachedHelper(this: any, ...argumentsWithoutPCC: FunctionToCacheArguments) {
		const argumentsCacheKey = createHash("sha1").update(driveCMSCacheKey(argumentsWithoutPCC)).digest("base64");
		const cacheKey = `${cacheNamePreferablyFunctionName}__${stringToURLSafeString(argumentsCacheKey)}` as CacheKey;

		const debouncePromise = persistentCacheDebounceFunctionCalls.get(cacheKey) as Promise<FunctionToCacheReturn>;
		if (debouncePromise) {
			// console.debug("DEBOUNCE");
			return debouncePromise;
		}

		const thisComputationDebouncePromiseResolvers = Promise.withResolvers<FunctionToCacheReturn>();
		persistentCacheDebounceFunctionCalls.set(cacheKey, thisComputationDebouncePromiseResolvers.promise);

		// ==================================================
		// Setup state used for invalidation
		const invalidationFlag = getInvalidationFlag(cacheKey);

		if (!persistentCacheInvalidationMap.has(cacheKey)) {
			persistentCacheInvalidationMap.set(cacheKey, false);
		}

		if (!persistentCacheDisableAutomaticInvalidationMap.has(cacheKey)) {
			persistentCacheDisableAutomaticInvalidationMap.set(cacheKey, false);
		}

		const disableAutomaticInvalidationFlag = persistentCacheDisableAutomaticInvalidationMap.get(cacheKey) ?? false;

		// ==================================================
		// PersistentCacheController definition
		function getCachedValue() {
			return safePromise(() => persistentCache.getItem(cacheKey)) as ErrorReturnPromise<CachedValueT>;
		}

		async function setCachedValue(value: CachedValueT | typeof REMOVE_PERSISTENT_CACHE_VALUE) {
			// console.debug("set cache", cacheKey, process.pid);

			if (value === REMOVE_PERSISTENT_CACHE_VALUE) {
				const [_value, error] = await safePromise(() => persistentCache.removeItem(cacheKey));
				return error;
			}

			const [_value, error] = await safePromise(() => persistentCache.setItem(cacheKey, value));
			return error;
		}

		function disableAutomaticInvalidation() {
			// ==================================================
			// TODO: Think about this,
			// When a function is double cached meaning, downloadDoc calls -> downloadDocInternal and both of them want manual invalidation.
			// Will it work?
			// ==================================================
			persistentCacheDisableAutomaticInvalidationMap.set(cacheKey, true);
		}

		const pcc: PersistentCacheController<CachedValueT> = {
			disableAutomaticInvalidation,
			getCachedValue,
			setCachedValue,
		};

		// ==================================================
		// Invalidation logic
		if (invalidationFlag) {
			persistentCacheInvalidationMap.set(cacheKey, false);

			if (!disableAutomaticInvalidationFlag) {
				const removeItemError = await setCachedValue(REMOVE_PERSISTENT_CACHE_VALUE);
				if (removeItemError) {
					console.error(`Error while invalidating cache ${removeItemError}`);
					// TODO: Figure out what to do....
				}
			}
		}

		// ==================================================
		// Function call

		fn.apply(this, [pcc, ...argumentsWithoutPCC])
			.then(thisComputationDebouncePromiseResolvers.resolve)
			.catch(thisComputationDebouncePromiseResolvers.reject);

		return thisComputationDebouncePromiseResolvers.promise;
	}

	return persistentCachedHelper;
}

export function memoizeDriveCMS<FunctionToMemoize extends AnyFunction>(fn: FunctionToMemoize): FunctionToMemoize {
	return memoize(fn, {
		cache: memoizeCache,
		cacheKey: driveCMSCacheKey,
	});
}
