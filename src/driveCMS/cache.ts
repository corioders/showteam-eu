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

import { CORIODERS_INVALIDATE_PERSISTANT_CACHE } from "@/const.js";
import { type ErrorReturnPromise, safePromise } from "@/error/index.js";
import type { JsonValue } from "@/format/json/index.js";
import { stringToURLSafeString } from "@/net/url.js";
import cacheDriver from "@/storage/unstorage/cache-driver.mjs";

type AnyFunction = (...arguments_: readonly any[]) => any;

interface OurGlobalThis {
	__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE?: Map<any, any>;

	__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE?: UnstorageStorage;
	__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_INVALIDATION_MAP?: Map<CacheKey, boolean>;
	__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP?: Map<CacheKey, boolean>;
}
const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE = new Map();
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE = createStorage({
		// We don't need to use cacheDriver because every function should be also memorized. This is because
		// every function call EVEN IF using persistant cache costs us one fetch call to check if the resource has changed.
		driver: cacheDriver({ driver: fsDriver({ base: ".next/cache/corioders/cstd-ts-driveCMS-persistant" }) }),
		// driver: fsDriver({ base: '.next/cache/corioders/cstd-ts-driveCMS-persistant' }),
	});
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_INVALIDATION_MAP) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_INVALIDATION_MAP = new Map();
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP = new Map();
}

const persistantCache = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE;
const persistantCacheInvalidationMap = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_INVALIDATION_MAP;
const persistantCacheDisableAutomaticInvalidationMap = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTANT_CACHE_DISABLE_AUTOMATIC_INVALIDATION_MAP;

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

export const REMOVE_PERSISTANT_CACHE_VALUE = Symbol("INVALIDATE_PERSISTANT_CACHE");
export interface PersistantCacheController<CachedValueT extends JsonValue> {
	getCachedValue(): ErrorReturnPromise<CachedValueT>;
	setCachedValue(value: CachedValueT | typeof REMOVE_PERSISTANT_CACHE_VALUE): Promise<Error | null>;

	// disableAutomaticInvalidation allows for more optimal (manual) invalidation strategies.
	// For example. List folder must be invalidated automatically, but downloadDoc has more efficient manual invalidation strategy.
	disableAutomaticInvalidation(): void;
}

export interface PersistantCacheControllerThis<CachedValueT extends JsonValue> {
	persistantCacheController: PersistantCacheController<CachedValueT>;
}

type CacheKey = string & { readonly __cacheKeyTag: unique symbol };

export function invalidate() {
	memoizeCache.clear();

	for (const cacheKey of persistantCacheInvalidationMap.keys()) {
		persistantCacheInvalidationMap.set(cacheKey, true);
	}
}

function getInvalidationFlag(cacheKey: CacheKey): boolean {
	if (CORIODERS_INVALIDATE_PERSISTANT_CACHE) {
		return true;
	}

	return persistantCacheInvalidationMap.get(cacheKey) ?? false;
}

export function persistantDriveCMSCache<CachedValueT extends JsonValue, FunctionToCacheArguments extends any[] = unknown[], FunctionToCacheReturn = unknown>(
	cacheNamePreferablyFunctionName: string,
	fn: (persistantCacheController: PersistantCacheController<CachedValueT>, ..._arguments: FunctionToCacheArguments) => Promise<FunctionToCacheReturn>,
): (..._arguments: FunctionToCacheArguments) => Promise<FunctionToCacheReturn> {
	async function persistantCachedHelper(this: any, ...argumentsWithoutPCC: FunctionToCacheArguments) {
		const argumentsCacheKey = createHash("sha1").update(driveCMSCacheKey(argumentsWithoutPCC)).digest("base64");
		const cacheKey = `${cacheNamePreferablyFunctionName}__${stringToURLSafeString(argumentsCacheKey)}` as CacheKey;

		// ==================================================
		// Setup state used for invalidation
		if (!persistantCacheInvalidationMap.has(cacheKey)) {
			persistantCacheInvalidationMap.set(cacheKey, false);
		}

		const invalidationFlag = getInvalidationFlag(cacheKey);

		if (!persistantCacheDisableAutomaticInvalidationMap.has(cacheKey)) {
			persistantCacheDisableAutomaticInvalidationMap.set(cacheKey, false);
		}

		const disableAutomaticInvalidationFlag = persistantCacheDisableAutomaticInvalidationMap.get(cacheKey) ?? false;

		// ==================================================
		// PersistantCacheController definition
		function getCachedValue() {
			return safePromise(() => persistantCache.getItem(cacheKey)) as ErrorReturnPromise<CachedValueT>;
		}

		async function setCachedValue(value: CachedValueT | typeof REMOVE_PERSISTANT_CACHE_VALUE) {
			if (value === REMOVE_PERSISTANT_CACHE_VALUE) {
				const [_value, error] = await safePromise(() => persistantCache.removeItem(cacheKey));
				return error;
			}

			const [_value, error] = await safePromise(() => persistantCache.setItem(cacheKey, value));
			return error;
		}

		function disableAutomaticInvalidation() {
			// ==================================================
			// TODO: Think about this,
			// When a function is double cached meaning, downloadDoc calls -> downloadDocInternal and both of them want manual invalidation.
			// Will it work?
			// ==================================================
			persistantCacheDisableAutomaticInvalidationMap.set(cacheKey, true);
		}

		const pcc: PersistantCacheController<CachedValueT> = {
			disableAutomaticInvalidation,
			getCachedValue,
			setCachedValue,
		};

		// ==================================================
		// Invalidation logic
		if (invalidationFlag) {
			persistantCacheInvalidationMap.set(cacheKey, false);

			if (!disableAutomaticInvalidationFlag) {
				const removeItemError = await setCachedValue(REMOVE_PERSISTANT_CACHE_VALUE);
				if (removeItemError) {
					console.error(`Error while invalidating cache ${removeItemError}`);
					// TODO: Figure out what to do....
				}
			}
		}

		// ==================================================
		// Function call
		return fn.apply(this, [pcc, ...argumentsWithoutPCC]);
	}

	return persistantCachedHelper;
}

export function memoizeDriveCMS<FunctionToMemoize extends AnyFunction>(fn: FunctionToMemoize): FunctionToMemoize {
	return memoize(fn, {
		cache: memoizeCache,
		cacheKey: driveCMSCacheKey,
	});
}
