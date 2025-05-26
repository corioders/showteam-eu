// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import memoize from 'memoize';

interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: This is a readonly thing.
	// biome-ignore lint/suspicious/noExplicitAny: This is required by typescript
	__CSTD_NEXT_IMAGES_MEMOIZE_CACHE?: Map<any, any>;
}
const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (ourGlobalThis.__CSTD_NEXT_IMAGES_MEMOIZE_CACHE === undefined) {
	ourGlobalThis.__CSTD_NEXT_IMAGES_MEMOIZE_CACHE = new Map();
}

const memoizeCache = ourGlobalThis.__CSTD_NEXT_IMAGES_MEMOIZE_CACHE;

// TODO: Merge this with the one in driveCMS/cache.ts
function memoizeImagesCacheKey(functionArguments: readonly unknown[]) {
	let key = '';

	// biome-ignore lint/style/useForOf: here we need speed
	for (let i = 0; i < functionArguments.length; i++) {
		const argument = functionArguments[i];
		const argumentType = typeof argument;

		if (argumentType === 'string') {
			key += argument;
			continue;
		}

		if (argumentType === 'number' || argumentType === 'boolean') {
			key += String(argument);
			continue;
		}

		if (argument === undefined) {
			key += String(argument);
			continue;
		}

		if (argumentType === 'object') {
			key += JSON.stringify(argument);
			continue;
		}

		throw new Error(`Unsupported memorize argument type: ${argumentType}, ${argument}`);
	}

	return key;
}

// biome-ignore lint/suspicious/noExplicitAny: Any here is required.
type AnyFunction = (...arguments_: readonly any[]) => unknown;
export function memoizeImages<FunctionToMemoize extends AnyFunction>(fn: FunctionToMemoize): FunctionToMemoize {
	return memoize(fn, {
		cacheKey: memoizeImagesCacheKey,
		cache: memoizeCache,
	});
}
