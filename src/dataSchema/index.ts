// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import { type ErrorReturn, type ErrorReturnPromise, UnreachableErrorMessage } from '@/error/index.js';
import type { EmptyObject, Flatten, PrettifyHardcore, UnionToIntersection } from '@/type/index.js';

export type FetchParserPromiseReturn<FPR, _ProducesAggregateObject> = ErrorReturnPromise<FPR | false>;
export type FetchParserReturn<FPR, _ProducesAggregateObject = unknown> = ErrorReturn<FPR | false>;

export type GetFetchFetchParserReturnThatIsPassedToTheNextOne<FPF> = FPF extends FetchParserReturn<infer FPR, infer ProducesAggregateObject>
	? ProducesAggregateObject extends true
		? Flatten<FPR>
		: FPR
	: never;

export type FetchParserFunction<pFPR, FPR, RA = EmptyObject, _ProducesAggregateObject = unknown> = RA extends EmptyObject
	? (parentFetchParserReturn: pFPR) => FetchParserReturn<FPR, _ProducesAggregateObject> | FetchParserPromiseReturn<FPR, _ProducesAggregateObject>
	: (parentFetchParserReturn: pFPR, runtimeArguments: RA) => FetchParserReturn<FPR, _ProducesAggregateObject> | FetchParserPromiseReturn<FPR, _ProducesAggregateObject>;

export type TypeFunction<US, pFPR, FPR, RA, _ProducesAggregateObject> = (userSpecification: US) => FetchParserFunction<pFPR, FPR, RA, _ProducesAggregateObject>;
export type GetTypeFunctionReturnThatIsPassedToTheNextOne<TF> = TF extends TypeFunction<any, any, infer FPR, any, infer ProducesAggregateObject>
	? ProducesAggregateObject extends true
		? Flatten<FPR>
		: FPR
	: never;

// TODO: Make the types of the noop function work.
export const noopFunction = function noopFunction() {
	throw new Error(UnreachableErrorMessage('Noop function called. The logic inside fetchAndParseInternal handles noop function'));
};

export function defineTypeFunction<US, pFPR, FPR, RA = EmptyObject>(tf: TypeFunction<US, pFPR, FPR, RA, false>): TypeFunction<US, pFPR, FPR, RA, false> {
	return tf;
}

interface AggregateFunctionOptions {
	isAggregate: boolean;
	produceAggregateObjet: boolean;
}

export function defineTypeAggregateFunction<US, pFPR, FPR, RA = EmptyObject>(tf: TypeFunction<US, pFPR[], FPR[], RA, true>): TypeFunction<US, pFPR, FPR, RA, true> {
	const modifiedTF = function (this: unknown, us: US) {
		const fetchParserFunction = tf.apply(this, [us]);
		const fetchParserFunctionWithAggregateOptions = fetchParserFunction as typeof fetchParserFunction & AggregateFunctionOptions;
		fetchParserFunctionWithAggregateOptions.isAggregate = true;
		fetchParserFunctionWithAggregateOptions.produceAggregateObjet = true;
		return fetchParserFunctionWithAggregateOptions;
	};

	// Okay this is sort of hacky. But DSD does not need to know the *real* return types of the aggregate function.
	// It's easier to pretend it's a normal function, because indeed the transformation is handled during runtime. Invisible to user.
	return modifiedTF as unknown as TypeFunction<US, pFPR, FPR, RA, true>;
}

export function defineTypeAggregateToSingleFunction<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR[], FPR, RA, false>,
): TypeFunction<US, pFPR, FPR, RA, false> {
	const modifiedTF = function (this: unknown, us: US) {
		const fetchParserFunction = tf.apply(this, [us]);
		const fetchParserFunctionWithAggregateOptions = fetchParserFunction as typeof fetchParserFunction & AggregateFunctionOptions;
		fetchParserFunctionWithAggregateOptions.isAggregate = true;
		fetchParserFunctionWithAggregateOptions.produceAggregateObjet = false;
		return fetchParserFunctionWithAggregateOptions;
	};

	// Okay this is sort of hacky. But DSD does not need to know the *real* return types of the aggregate function.
	// It's easier to pretend it's a normal function, because indeed the transformation is handled during runtime. Invisible to user.
	return modifiedTF as TypeFunction<US, pFPR, FPR, RA, false>;
}

export type DataSchemaDefinition<T extends Record<string, Record<string, any>>, pFPR> = {
	[K in keyof T]: DataSchemaDefinitionNode<T[K], pFPR>;
};
export type DataSchemaDefinitionNode<T, pFPR> = T extends {
	type: FetchParserFunction<pFPR, infer FPR, any, any>;
	optional?: boolean;
	pipe?: infer PType;
}
	? {
			type: FetchParserFunction<pFPR, FPR, any, any>;
			optional?: boolean;
			pipe?: PType extends Record<string, Record<string, any>> ? DataSchemaDefinition<PType, GetFetchFetchParserReturnThatIsPassedToTheNextOne<FPR>> : never;
		}
	: {
			type: FetchParserFunction<pFPR, any, any, any>;
			optional?: boolean;
			pipe?: unknown;
		};

type ExtractRuntimeArgumentsFromFetchParserFunction<FPF> = FPF extends FetchParserFunction<any, any, infer RA, any> ? RA : never;
type ExtractRuntimeArgumentsFromDSDn<DSDn> = DSDn extends DataSchemaDefinitionNode<any, any>
	? // biome-ignore lint/complexity/noBannedTypes: Using {} is required for this type to work properly
		(ExtractRuntimeArgumentsFromFetchParserFunction<DSDn['type']> extends undefined ? {} : ExtractRuntimeArgumentsFromFetchParserFunction<DSDn['type']>) &
			// biome-ignore lint/complexity/noBannedTypes: Using {} is required for this type to work properly
			(DSDn['pipe'] extends DataSchemaDefinition<any, any> ? ExtractRuntimeArgumentsFromDSD<DSDn['pipe']> : {})
	: never;
type ExtractRuntimeArgumentsFromDSD<DSD> = DSD extends DataSchemaDefinition<any, any>
	? UnionToIntersection<{ [K in keyof DSD]: ExtractRuntimeArgumentsFromDSDn<DSD[K]> }[keyof DSD]>
	: never;

export function defineDataSchema<const T extends DataSchemaDefinition<T, void>>(dsd: T): Readonly<T> {
	return dsd;
}

export function defineDataSchemaNode<const T extends Record<string, any>>(dsd: T & DataSchemaDefinitionNode<T, any>): Readonly<T> {
	return dsd;
}

export type DataSchema<T extends DataSchemaDefinition<T, any>> = PrettifyHardcore<
	{
		[K in keyof T as T[K] extends { optional: true } ? never : K]: PrettifyHardcore<DataSchemaNode<T[K]>>;
	} & {
		[K in keyof T as T[K] extends { optional: true } ? K : never]?: PrettifyHardcore<DataSchemaNode<T[K]>>;
	}
>;

export type DataSchemaNode<T> = T extends { type: FetchParserFunction<infer pFPR, infer FPR, any, infer ProducesAggregateObject>; pipe?: infer PType }
	? ProducesAggregateObject extends false
		? {
				dataUsed: pFPR;
				result: ErrorReturn<FPR>;
				next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchema<PType> : never) : never;
			}
		: {
				dataUsed: pFPR;
				result: ErrorReturn<FPR[]>;
				aggregate: T extends { pipe: PType }
					? {
							result: ErrorReturn<FPR>;
							next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchema<PType> : never) : never;
						}[]
					: never;
			}
	: never;

type IsEmptyObject<T> = keyof T extends never ? true : false;

export function fetchAndParse<T extends DataSchemaDefinition<T, any>>(dsd: T, runtimeArguments: ExtractRuntimeArgumentsFromDSD<T>): ErrorReturnPromise<DataSchema<T>>;

export function fetchAndParse<T extends DataSchemaDefinition<T, any>>(
	dsd: T,
): IsEmptyObject<ExtractRuntimeArgumentsFromDSD<T>> extends true ? ErrorReturnPromise<DataSchema<T>> : never;

export async function fetchAndParse<T extends DataSchemaDefinition<T, any>>(
	dsd: T,
	runtimeArguments?: ExtractRuntimeArgumentsFromDSD<T>,
): ErrorReturnPromise<DataSchema<T>> {
	const currentPipe = dsd;
	const currentResult = {};
	const runtimeArgs = (runtimeArguments ?? {}) as Record<string, unknown>;
	const error = await fetchAndParseInternal(runtimeArgs, currentPipe, currentResult, [null, null], '');
	if (error) {
		return [null, error];
	}

	return [currentResult as DataSchema<T>, null];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
async function fetchAndParseInternal(
	runtimeArguments: Record<string, unknown>,
	currentPipe: Record<string, Record<string, unknown>>,
	currentResult: Record<string, Record<string, unknown>>,
	parentFetchParserErrorReturn: ErrorReturn<unknown>,
	currentDebugPath: string,
): Promise<Error | null> {
	const pipeNames = Object.keys(currentPipe);
	const [parentFetchParserReturn, parentFetchParserError] = parentFetchParserErrorReturn;

	for (const pipeName of pipeNames) {
		const entry = currentPipe[pipeName] as { type: FetchParserFunction<any, any, any, any> & Partial<AggregateFunctionOptions>; optional?: boolean; pipe?: any };
		const entryDebugPath = `${currentDebugPath} > ${pipeName}`;

		const fetchParser = entry.type;

		// When a resultEntry has been created it means that this entry has been processed.
		// One entry can be processed once.
		if (currentResult[pipeName]) {
			return new Error(`Fetch parser tried processing two array entries from it's parent. Debug path: ${entryDebugPath}`);
		}

		const resultEntry: Record<string, unknown> = {};
		let resultEntryProcessed = true;

		let fetchParserReturn: any = null;
		let fetchParserError: any = null;
		if (fetchParser === noopFunction) {
			fetchParserReturn = parentFetchParserReturn;
			fetchParserError = parentFetchParserError;

			// Noop function executed successfully.
			resultEntryProcessed = true;
		} else if (parentFetchParserError) {
			fetchParserReturn = null;
			fetchParserError = parentFetchParserError;

			// We want to preserve this error.
			resultEntryProcessed = true;
		} else if (fetchParser.isAggregate) {
			// ==================================================
			// Aggregation support
			const aggregateArguments = Array.isArray(parentFetchParserReturn) ? parentFetchParserReturn : [parentFetchParserReturn];

			resultEntry['dataUsed'] = aggregateArguments;
			[fetchParserReturn, fetchParserError] = await fetchParser(aggregateArguments, runtimeArguments);
			if (fetchParserReturn === false) {
				resultEntryProcessed = false;
			}
			// ==================================================
		} else if (Array.isArray(parentFetchParserReturn)) {
			// ==================================================
			// Our parent returned an array. We process exactly one item from it.
			let isProcessed = false;
			for (const parentFetchParserReturnItem of parentFetchParserReturn) {
				const [localFetchParserReturn, localFetchParserError] = await fetchParser(parentFetchParserReturnItem, runtimeArguments);
				if (localFetchParserReturn === false) {
					continue;
				}

				if (isProcessed === true) {
					throw new Error(`Fetch parser tried processing more than one array entry from it's parent. Debug path: ${entryDebugPath}`);
				}

				isProcessed = true;
				resultEntry['dataUsed'] = parentFetchParserReturnItem;
				fetchParserReturn = localFetchParserReturn;
				fetchParserError = localFetchParserError;
			}

			if (isProcessed === false) {
				resultEntryProcessed = false;
			}
			// ==================================================
		} else {
			// ==================================================
			// Our parent returned single element.
			resultEntry['dataUsed'] = parentFetchParserReturn;
			[fetchParserReturn, fetchParserError] = await fetchParser(parentFetchParserReturn, runtimeArguments);
			if (fetchParserReturn === false) {
				resultEntryProcessed = false;
			}
			// ==================================================
		}

		if (!resultEntryProcessed) {
			if (entry.optional) {
				continue;
			}
			fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
		}

		currentResult[pipeName] = resultEntry;
		const nextPipe = entry.pipe;
		resultEntry['result'] = [fetchParserReturn, fetchParserError];
		if (!nextPipe) {
			continue;
		}
		if (Object.keys(nextPipe).length === 0) {
			return new Error(`The pipe object cannot be empty ${entryDebugPath}`);
		}

		if (fetchParser.produceAggregateObjet) {
			const aggregate: any = [];
			resultEntry['aggregate'] = aggregate;
			if (fetchParserReturn) {
				if (!Array.isArray(fetchParserReturn)) {
					return new Error(`Fetch parser did not return an array but it is an aggregate function. ${entryDebugPath}`);
				}

				for (let i = 0; i < fetchParserReturn.length; i++) {
					const fetchParserReturnItem = fetchParserReturn[i];
					const result = {};
					await fetchAndParseInternal(runtimeArguments, nextPipe, result, [fetchParserReturnItem, null], `${entryDebugPath}[${i}]`);
					aggregate.push({
						result: [fetchParserReturnItem, null],
						next: result,
					});
				}
			}
		} else {
			resultEntry['next'] = {};
			await fetchAndParseInternal(
				runtimeArguments,
				nextPipe,
				resultEntry['next'] as Record<string, Record<string, unknown>>,
				[fetchParserReturn, fetchParserError],
				entryDebugPath,
			);
		}
	}

	return null;
}

type ExtractAllDataSchemaNodes<DSD> = DSD extends DataSchemaDefinition<any, any>
	? {
			[K in keyof DSD]: DSD[K] extends { pipe: infer P } ? DSD[K] | (P extends DataSchemaDefinition<any, any> ? ExtractAllDataSchemaNodes<P> : never) : DSD[K];
		}[keyof DSD]
	: never;

export type RemovePipeAtCutPoints<DSD, CutPoints> = DSD extends DataSchemaDefinition<any, any>
	? {
			[K in keyof DSD]: DSD[K] extends CutPoints
				? Omit<DSD[K], 'pipe'>
				: DSD[K] extends { pipe: infer P }
					? DSD[K] extends { pipe: DataSchemaDefinition<any, any> }
						? Omit<DSD[K], 'pipe'> & { pipe: RemovePipeAtCutPoints<P, CutPoints> }
						: DSD[K]
					: DSD[K];
		}
	: never;

const CUT_POINT_DONE_KEY = '_DSD_INTERNAL_CUT_POINT_DONE';
export function cutoffDataSchemaDefinition<
	const T extends DataSchemaDefinition<T, any>,
	const CutPoint extends ExtractAllDataSchemaNodes<T>,
	const CutPoints extends readonly CutPoint[],
>(originalDSD: T, cutPointNodes: CutPoints): ErrorReturn<RemovePipeAtCutPoints<T, CutPoints[number]>> {
	const clonedDSD = deepClone(originalDSD);

	const cutPoints = cutPointNodes as unknown as Record<string, unknown>[];
	for (const cutPoint of cutPoints) {
		const err = modifyDSD(originalDSD, clonedDSD, cutPoint as Record<string, unknown>);
		if (err) {
			return [null, err];
		}
	}

	for (const cutPoint of cutPoints) {
		if (!cutPoint[CUT_POINT_DONE_KEY]) {
			return [
				null,
				new Error(`Error you provided more cut points than necessary. We errored when trying to process this cut point:\n${JSON.stringify(cutPoint, null, 2)}`),
			];
		}

		delete cutPoint[CUT_POINT_DONE_KEY];
	}

	const shallowDSD = clonedDSD as unknown as RemovePipeAtCutPoints<T, CutPoints[number]>;
	return [shallowDSD, null];
}

function modifyDSD(
	originalDSD: Record<string, Record<string, unknown>>,
	clonedDSD: Record<string, Record<string, unknown>> | undefined,
	cutPoint: Record<string, unknown>,
): Error | null {
	if (cutPoint[CUT_POINT_DONE_KEY]) {
		return null;
	}

	if (!clonedDSD) {
		return new Error(`Error you provided cut points where one is their parent. We errored when trying to process this cut point:\n${JSON.stringify(cutPoint, null, 2)}`);
	}

	const pipeKeys = Object.keys(originalDSD);
	for (const pipeKey of pipeKeys) {
		const original = originalDSD[pipeKey] as Record<string, unknown>;
		const cloned = clonedDSD[pipeKey] as Record<string, unknown>;

		if (original === cutPoint) {
			if (original[CUT_POINT_DONE_KEY]) {
				return new Error(`Error you provided more cut points than necessary. We errored when trying to process this cut point:\n${JSON.stringify(cutPoint, null, 2)}`);
			}

			cutPoint[CUT_POINT_DONE_KEY] = true;
			// biome-ignore lint/performance/noDelete: <explanation>
			delete cloned['pipe'];
			continue;
		}

		if (original[CUT_POINT_DONE_KEY]) {
			continue;
		}

		if (!original['pipe']) {
			continue;
		}

		const err = modifyDSD(original['pipe'] as Record<string, Record<string, unknown>>, cloned['pipe'] as Record<string, Record<string, unknown>>, cutPoint);
		if (err) {
			return err;
		}
	}

	return null;
}

export type DataSchemaErrorBounded<T extends DataSchemaDefinition<T, any>> = PrettifyHardcore<
	{
		[K in keyof T as T[K] extends { optional: true } ? never : K]: PrettifyHardcore<DataSchemaNodeErrorBounded<T[K]>>;
	} & {
		[K in keyof T as T[K] extends { optional: true } ? K : never]?: PrettifyHardcore<DataSchemaNodeErrorBounded<T[K]>>;
	}
>;

export type DataSchemaNodeErrorBounded<T> = T extends { type: FetchParserFunction<infer pFPR, infer FPR, any, infer ProducesAggregateObject>; pipe?: infer PType }
	? ProducesAggregateObject extends false
		? {
				dataUsed: pFPR;
				result: FPR;
				next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchemaErrorBounded<PType> : never) : never;
			}
		: {
				dataUsed: pFPR;
				result: FPR;
				aggregate: {
					result: FPR;
					next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchemaErrorBounded<PType> : never) : never;
				}[];
			}
	: never;

export type DataSchemaToDataSchemaErrorBounded<DS> = DS extends DataSchema<infer DSD extends Record<string, any>> ? DataSchemaErrorBounded<DSD> : never;
export type DataSchemaNodeToDataSchemaNodeErrorBounded<DSN> = DSN extends DataSchemaNode<infer DSDN> ? DataSchemaNodeErrorBounded<DSDN> : never;

export function dataSchemaErrorBoundary<T extends DataSchemaDefinition<T, any>, DS extends DataSchema<T>>(
	originalDataSchema: DS,
): ErrorReturn<DataSchemaToDataSchemaErrorBounded<DS>, AggregateError> {
	const errorsSet: Set<Error> = new Set();

	const dataSchema = deepClone(originalDataSchema);
	for (const dataSchemaNode of Object.values(dataSchema)) {
		dataSchemaErrorBoundaryRecursive(dataSchemaNode, errorsSet);
	}

	if (errorsSet.size > 0) {
		const errors = [...errorsSet.values()];
		return [null, new AggregateError(errors, errors.map((e) => e.message).join('\n'))];
	}

	return [dataSchema as unknown as DataSchemaToDataSchemaErrorBounded<DS>, null];
}

function dataSchemaErrorBoundaryRecursive(dataSchemaNode: any, errors: Set<Error>) {
	const [result, resultError] = dataSchemaNode.result;
	if (resultError) {
		errors.add(resultError);
	}

	if (result) {
		dataSchemaNode.result = result;
	}

	if (dataSchemaNode.next) {
		for (const childNode of Object.values(dataSchemaNode.next)) {
			dataSchemaErrorBoundaryRecursive(childNode, errors);
		}
	}

	if (dataSchemaNode.aggregate) {
		for (const aggregateEntry of dataSchemaNode.aggregate) {
			for (const childNode of Object.values(aggregateEntry.next)) {
				dataSchemaErrorBoundaryRecursive(childNode, errors);
			}
		}
	}
}

function deepClone<T>(value: T): T {
	// Handle null explicitly (typeof null === 'object')
	if (value === null || typeof value !== 'object') {
		return value;
	}

	// Handle Date objects
	if (value instanceof Date) {
		return new Date(value.getTime()) as T;
	}

	// Handle RegExp objects
	if (value instanceof RegExp) {
		return new RegExp(value.source, value.flags) as T;
	}

	// Handle Map objects
	if (value instanceof Map) {
		const clonedMap = new Map();
		for (const [key, val] of value) {
			clonedMap.set(deepClone(key), deepClone(val));
		}
		return clonedMap as T;
	}

	// Handle Set objects
	if (value instanceof Set) {
		const clonedSet = new Set();
		for (const item of value) {
			clonedSet.add(deepClone(item));
		}
		return clonedSet as T;
	}

	// Handle Arrays
	if (Array.isArray(value)) {
		return value.map((item) => deepClone(item)) as T;
	}

	// Handle plain objects
	if (value.constructor === Object || !value.constructor) {
		const cloned: Record<string, unknown> = {};
		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				cloned[key] = deepClone(value[key]);
			}
		}
		return cloned as T;
	}

	// For other object types (classes, etc.), return as-is
	// This prevents errors with complex objects that shouldn't be cloned
	return value;
}
