import { GoogleAuth } from 'googleapis-common';
import memoize from 'memoize';

interface OurGlobalThis {
	// biome-ignore lint/style/useNamingConvention: This is a readonly thing.
	// biome-ignore lint/suspicious/noExplicitAny: This is required by typescript
	__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE?: Map<any, any>;
}
const ourGlobalThis = (global ?? globalThis ?? window ?? {}) as OurGlobalThis;
if (ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE === undefined) {
	ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE = new Map();
}

const memoizeCache = ourGlobalThis.__CSTD_TS_DRIVE_CMS_MEMOIZE_CACHE;

function memoizeDriveCMSCacheKey(functionArguments: readonly unknown[]) {
	let key = '';

	// biome-ignore lint/style/useForOf: here we need speed
	for (let i = 0; i < functionArguments.length; i++) {
		const argument = functionArguments[i];
		const argumentType = typeof argument;

		if (argumentType === 'string') {
			key += argument;
			continue;
		}

		if (argumentType === 'number') {
			key += String(argument);
			continue;
		}

		if (argument instanceof GoogleAuth) {
			key += JSON.stringify(argument.jsonContent);
			continue;
		}

		throw new Error(`Unsupported memorize argument type: ${argumentType}, ${argument}`);
	}

	return key;
}

type AnyFunction = (...arguments_: readonly unknown[]) => unknown;
export function memoizeDriveCMS<FunctionToMemoize extends AnyFunction>(fn: FunctionToMemoize): FunctionToMemoize {
	return memoize(fn, {
		cacheKey: memoizeDriveCMSCacheKey,
		cache: memoizeCache,
	});
}
