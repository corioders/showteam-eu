// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

/** biome-ignore-all lint/style/useNamingConvention: This file does a lot of global shenanigans, we need to use our names */

import { createHash } from "node:crypto";

import { GoogleAuth } from "googleapis-common";
import type { Database } from "lmdb";
import { open as openLMDB } from "lmdb";
import memoize from "memoize";
import { createStorage, type Storage as UnstorageStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs-lite";

import { type ErrorReturnPromise, safePromise } from "@/error/index.js";
import type { JsonValue } from "@/format/json/index.js";
import { stringToURLSafeString } from "@/net/url.js";
import type { FileOrFolderPath } from "@/os/path/index.js";
import { type InterprocessLockManager, newInterprocessLockManagerSync } from "@/runtime/interprocess-lock.js";
import cacheDriver from "@/storage/unstorage/cache-driver.mjs";

type AnyFunction = (...arguments_: readonly any[]) => any;

interface OurGlobalThis {
	__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE?: Map<any, any>;

	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE?: UnstorageStorage;
	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS?: Map<CacheKey, Promise<unknown>>;

	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_INTERPROCESS_DATABASE?: Database<boolean, CacheKey>;

	__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INTERPROCESS_LOCK_MANAGER?: InterprocessLockManager;
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
	});
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS = new Map();
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_INTERPROCESS_DATABASE) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_INTERPROCESS_DATABASE = openLMDB({
		path: ".next/cache/corioders/cstd-ts-driveCMS-persistent-invalidation-interprocess-database",
	});
}

if (!ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INTERPROCESS_LOCK_MANAGER) {
	const [lockManager, lockManagerError] = newInterprocessLockManagerSync(
		".next/cache/corioders/cstd-ts-driveCMS-persistent-interprocess-lock-manager" as FileOrFolderPath,
	);
	if (lockManagerError) {
		console.error(lockManagerError);
	} else {
		ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INTERPROCESS_LOCK_MANAGER = lockManager;
	}
}

const memoizeCache = ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE;

const persistentCache = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE;
const persistentCacheDebounceFunctionCalls = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_DEBOUNCE_FUNCTION_CALLS;

const persistentCacheInvalidationInterprocessDatabase = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INVALIDATION_INTERPROCESS_DATABASE;

const persistentCacheInterprocessLockManager = ourGlobalThis.__CSTD_TS_DRIVE_CMS_PERSISTENT_CACHE_INTERPROCESS_LOCK_MANAGER;

export function driveCMSCacheKey(functionArguments: readonly unknown[]) {
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

		key += `${argumentType}:${String(argument)}`;
	}

	return key;
}

export const REMOVE_PERSISTENT_CACHE_VALUE = Symbol("INVALIDATE_PERSISTENT_CACHE");
export interface PersistentCacheController<CachedValueT extends JsonValue> {
	getCachedValue(): ErrorReturnPromise<CachedValueT>;
	setCachedValue(value: CachedValueT | typeof REMOVE_PERSISTENT_CACHE_VALUE): Promise<Error | null>;
}

export interface PersistentCacheControllerThis<CachedValueT extends JsonValue> {
	persistentCacheController: PersistentCacheController<CachedValueT>;
}

type CacheKey = string & { readonly __cacheKeyTag: unique symbol };

export async function invalidateDriveCMS() {
	memoizeCache.clear();
	persistentCacheDebounceFunctionCalls.clear();

	await persistentCacheInvalidationInterprocessDatabase.drop();
}

export interface PersistentDriveCMSCacheOptions {
	// disableAutomaticInvalidation allows for more optimal (manual) invalidation strategies.
	// For example. List folder must be invalidated automatically, but downloadDoc has more efficient manual invalidation strategy.
	disableAutomaticInvalidation?: boolean;
}

export function persistentDriveCMSCache<CachedValueT extends JsonValue, FunctionToCacheArguments extends any[] = unknown[], FunctionToCacheReturn = unknown>(
	cacheNamePreferablyFunctionName: string,
	persistentDriveCMSCacheOptions: PersistentDriveCMSCacheOptions | null,
	fn: (persistentCacheController: PersistentCacheController<CachedValueT>, ..._arguments: FunctionToCacheArguments) => Promise<FunctionToCacheReturn>,
): (..._arguments: FunctionToCacheArguments) => Promise<FunctionToCacheReturn> {
	async function persistentCachedHelper(this: any, ...argumentsWithoutPCC: FunctionToCacheArguments) {
		const argumentsCacheKey = createHash("sha1").update(driveCMSCacheKey(argumentsWithoutPCC)).digest("base64");
		const cacheKey = `${cacheNamePreferablyFunctionName}__${stringToURLSafeString(argumentsCacheKey)}` as CacheKey;

		const debouncePromise = persistentCacheDebounceFunctionCalls.get(cacheKey) as Promise<FunctionToCacheReturn>;
		if (debouncePromise) {
			return debouncePromise;
		}

		const thisComputationDebouncePromiseResolvers = Promise.withResolvers<FunctionToCacheReturn>();
		persistentCacheDebounceFunctionCalls.set(cacheKey, thisComputationDebouncePromiseResolvers.promise);

		// ==================================================
		// ==================================================
		// ONLY ONE PROCESS FROM THIS POINT ON
		// ponytail: cache remains usable without an interprocess lock; restore locking after the filesystem issue is resolved.
		const singleProcessLock = persistentCacheInterprocessLockManager?.newLock(cacheKey);
		const singleProcessUnlock = singleProcessLock ? (await singleProcessLock.lock()).unlock : () => {};

		// ==================================================
		// PersistentCacheController definition
		const getCachedValue = async () => {
			return safePromise(() => persistentCache.getItem(cacheKey)) as ErrorReturnPromise<CachedValueT>;
		};

		const setCachedValue = async (value: CachedValueT | typeof REMOVE_PERSISTENT_CACHE_VALUE) => {
			if (value === REMOVE_PERSISTENT_CACHE_VALUE) {
				const [_, error] = await safePromise(() => persistentCache.removeItem(cacheKey));
				return error;
			}

			const [_, error] = await safePromise(() => persistentCache.setItem(cacheKey, value));
			return error;
		};

		const pcc: PersistentCacheController<CachedValueT> = {
			getCachedValue,
			setCachedValue,
		};

		// ==================================================
		// Invalidation logic
		const disableAutomaticInvalidationFlag = persistentDriveCMSCacheOptions?.disableAutomaticInvalidation ?? false;

		if (!disableAutomaticInvalidationFlag) {
			// TODO: Can we throw here? (if so safe promise)
			const invalidationFlag = await persistentCacheInvalidationInterprocessDatabase.ifNoExists(cacheKey, () => {
				persistentCacheInvalidationInterprocessDatabase.put(cacheKey, false);
			});

			if (invalidationFlag) {
				// TODO: Can the put function throw here? (if so safe promise)
				await persistentCacheInvalidationInterprocessDatabase.put(cacheKey, false);
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
			.catch(thisComputationDebouncePromiseResolvers.reject)
			.finally(() => {
				singleProcessUnlock();
			});

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
