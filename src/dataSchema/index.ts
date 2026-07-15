// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

/** biome-ignore-all lint/style/useNamingConvention: We want to use our names for type parameters */

// TODO: dsdV2, make optional work nice + add the ability to define custom help messages in dsd

import { type ErrorReturn, type ErrorReturnPromise, type TSError, unreachableErrorMessage } from "@/error/index.js";
import type { EmptyObject, Flatten, PrettifyHardcore, UnionToIntersection } from "@/type/index.js";

export type FetchParserPromiseReturn<FPRT, _TakesAggregateObject, _ProducesAggregateObject> = ErrorReturnPromise<FPRT | false>;
export type FetchParserReturn<FPRT, _TakesAggregateObject, _ProducesAggregateObject> = ErrorReturn<FPRT | false>;

type FetchParserFunctionInternal<pFPR, FPR, RA, _TakesAggregateObject, _ProducesAggregateObject, _ReturnsPromise> = _ReturnsPromise extends false
	? FetchParserFunction<pFPR, FPR, RA, _TakesAggregateObject, _ProducesAggregateObject>
	: FetchParserFunctionPromise<pFPR, FPR, RA, _TakesAggregateObject, _ProducesAggregateObject>;

export type FetchParserFunction<pFPR, FPR, RA = EmptyObject, _TakesAggregateObject = unknown, _ProducesAggregateObject = unknown> = RA extends EmptyObject
	? (parentFetchParserReturn: pFPR) => FetchParserReturn<FPR, _TakesAggregateObject, _ProducesAggregateObject>
	: (parentFetchParserReturn: pFPR, runtimeArguments: RA) => FetchParserReturn<FPR, _TakesAggregateObject, _ProducesAggregateObject>;

export type FetchParserFunctionPromise<pFPR, FPR, RA = EmptyObject, _TakesAggregateObject = unknown, _ProducesAggregateObject = unknown> = RA extends EmptyObject
	? (parentFetchParserReturn: pFPR) => FetchParserPromiseReturn<FPR, _TakesAggregateObject, _ProducesAggregateObject>
	: (parentFetchParserReturn: pFPR, runtimeArguments: RA) => FetchParserPromiseReturn<FPR, _TakesAggregateObject, _ProducesAggregateObject>;

export type TypeFunction<US, pFPR, FPR, RA, _TakesAggregateObject, _ProducesAggregateObject, _ReturnsPromise> = (
	userSpecification: US,
) => FetchParserFunctionInternal<pFPR, FPR, RA, _TakesAggregateObject, _ProducesAggregateObject, _ReturnsPromise>;

type NoopFunction = FetchParserFunction<any, any> & { readonly __noopFunctionTag: unique symbol };

export const typeNoopFunction = function noopTypeFunction() {
	throw new Error(unreachableErrorMessage("Noop type function called. The logic inside fetchAndParseInternal handles noop type function"));
} as unknown as NoopFunction;

export function defineTypeFunction<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR, FPR, RA, false, false, false>,
): TypeFunction<US, pFPR, FPR, RA, false, false, false> {
	return tf;
}

export function defineTypeFunctionPromise<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR, FPR, RA, false, false, true>,
): TypeFunction<US, pFPR, FPR, RA, false, false, true> {
	return tf;
}

interface AggregateFunctionOptions {
	isAggregate: boolean;
	produceAggregateObjet: boolean;
}

export function defineTypeAggregateFunction<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR[], FPR[], RA, true, true, false>,
): TypeFunction<US, pFPR[], FPR[], RA, true, true, false> {
	const modifiedTF = function (this: unknown, us: US) {
		const fetchParserFunction = tf.apply(this, [us]);
		const fetchParserFunctionWithAggregateOptions = fetchParserFunction as typeof fetchParserFunction & AggregateFunctionOptions;
		fetchParserFunctionWithAggregateOptions.isAggregate = true;
		fetchParserFunctionWithAggregateOptions.produceAggregateObjet = true;
		return fetchParserFunctionWithAggregateOptions;
	};

	return modifiedTF;
}

export function defineTypeAggregateFunctionPromise<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR[], FPR[], RA, true, true, true>,
): TypeFunction<US, pFPR[], FPR[], RA, true, true, true> {
	return defineTypeAggregateFunction(tf as unknown as TypeFunction<US, pFPR[], FPR[], RA, true, true, false>) as unknown as TypeFunction<
		US,
		pFPR[],
		FPR[],
		RA,
		true,
		true,
		true
	>;
}

export function defineTypeAggregateToSingleFunction<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR[], FPR, RA, true, false, false>,
): TypeFunction<US, pFPR[], FPR, RA, true, false, false> {
	const modifiedTF = function (this: unknown, us: US) {
		const fetchParserFunction = tf.apply(this, [us]);
		const fetchParserFunctionWithAggregateOptions = fetchParserFunction as typeof fetchParserFunction & AggregateFunctionOptions;
		fetchParserFunctionWithAggregateOptions.isAggregate = true;
		fetchParserFunctionWithAggregateOptions.produceAggregateObjet = false;
		return fetchParserFunctionWithAggregateOptions;
	};

	return modifiedTF;
}

export function defineTypeAggregateToSingleFunctionPromise<US, pFPR, FPR, RA = EmptyObject>(
	tf: TypeFunction<US, pFPR[], FPR, RA, true, false, true>,
): TypeFunction<US, pFPR[], FPR, RA, true, false, true> {
	return defineTypeAggregateToSingleFunction(tf as unknown as TypeFunction<US, pFPR[], FPR, RA, true, false, false>) as unknown as TypeFunction<
		US,
		pFPR[],
		FPR,
		RA,
		true,
		false,
		true
	>;
}

export type DataSchemaDefinition<T extends Record<string, Record<string, any>>, pFPR> = {
	[K in keyof T]: DataSchemaDefinitionNode<T[K], pFPR>;
};

// type GetFetchParserReturnPassedToChild<FPR, _ProducesAggregateObject> = _ProducesAggregateObject extends true ? Flatten<FPR> : FPR;
// type GetFetchParserReturnPassedToChild<FPR, _ProducesAggregateObject> = FPR;
type GetFetchParserReturnPassedToChild<FPR, ProducesAggregateObject> = ProducesAggregateObject extends true ? Flatten<Flatten<FPR>> : Flatten<FPR>;
type ModifyPFprToGetCorrectArrayOrNotArrayType<pFPR, TakesAggregateObject, _ProducesAggregateObject> = TakesAggregateObject extends true ? pFPR[] : pFPR;

export type DataSchemaDefinitionNode<T, pFPR = unknown> = T extends {
	as: FetchParserFunctionInternal<any, infer FPR, any, infer TakesAggregateObject, infer ProducesAggregateObject, any>;
	optional?: boolean;
	pipe?: infer PType;
}
	? T extends {
			as: NoopFunction;
			optional?: boolean;
			pipe?: infer PType;
		}
		? {
				as: NoopFunction;
				optional?: boolean;
				pipe?: PType extends Record<string, Record<string, any>> ? DataSchemaDefinition<PType, pFPR> : never;
			}
		: {
				as: FetchParserFunctionInternal<ModifyPFprToGetCorrectArrayOrNotArrayType<pFPR, TakesAggregateObject, ProducesAggregateObject>, FPR, any, any, any, any>;
				optional?: boolean;
				pipe?: PType extends Record<string, Record<string, any>> ? DataSchemaDefinition<PType, GetFetchParserReturnPassedToChild<FPR, ProducesAggregateObject>> : never;
			}
	: {
			as: FetchParserFunctionInternal<any, any, any, any, any, any>;
			optional?: boolean;
			pipe?: unknown;
		};

type ExtractRuntimeArgumentsFromFetchParserFunction<FPF> = FPF extends FetchParserFunctionInternal<any, any, infer RA, any, any, any> ? RA : never;
type ExtractRuntimeArgumentsFromDSDn<DSDn> =
	DSDn extends DataSchemaDefinitionNode<any, any>
		? // biome-ignore lint/complexity/noBannedTypes: Using {} is required for this type to work properly
			(ExtractRuntimeArgumentsFromFetchParserFunction<DSDn["as"]> extends undefined ? {} : ExtractRuntimeArgumentsFromFetchParserFunction<DSDn["as"]>) &
				// biome-ignore lint/complexity/noBannedTypes: Using {} is required for this type to work properly
				(DSDn["pipe"] extends DataSchemaDefinition<any, any> ? ExtractRuntimeArgumentsFromDSD<DSDn["pipe"]> : {})
		: never;
type ExtractRuntimeArgumentsFromDSD<DSD> =
	DSD extends DataSchemaDefinition<any, any> ? UnionToIntersection<{ [K in keyof DSD]: ExtractRuntimeArgumentsFromDSDn<DSD[K]> }[keyof DSD]> : never;

export function defineDataSchema<const T extends DataSchemaDefinition<T, void>>(dsd: T): Readonly<T> {
	return dsd;
}

type InferDataSchemaNodeParentReturn<T> = T extends DataSchemaDefinitionNode<T, infer pFPF> ? pFPF : never;
type IfPFpfIsNeverError<pFPF> = [pFPF] extends [never]
	? TSError<"You provided two or more type functions at the same level that take DIFFERENT inputs. Please revise your DSDN. Or there is another error with your DSDN definition">
	: pFPF;

export function defineDataSchemaNode<const T extends Record<string, any>, pFPF extends InferDataSchemaNodeParentReturn<T>>(
	dsdn: T & DataSchemaDefinitionNode<T, IfPFpfIsNeverError<pFPF>>,
): Readonly<T> {
	return dsdn;
}

export type DataSchema<T extends DataSchemaDefinition<T, any>> = {
	[K in keyof T as T[K] extends { optional: true } ? never : K]: DataSchemaNode<T[K]>;
} & {
	[K in keyof T as T[K] extends { optional: true } ? K : never]?: DataSchemaNode<T[K]>;
};

export type DataSchemaNode<T> = T extends { as: NoopFunction; pipe?: infer PType }
	? { next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchema<PType> : never) : never }
	: T extends { as: FetchParserFunctionInternal<infer pFPR, infer FPR, any, any, infer ProducesAggregateObject, any>; pipe?: infer PType }
		? ProducesAggregateObject extends false
			? PrettifyHardcore<{
					dataUsed?: PrettifyHardcore<pFPR>;
					result: ErrorReturn<FPR>;
					next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchema<PType> : never) : never;
				}>
			: PrettifyHardcore<{
					dataUsed?: PrettifyHardcore<pFPR>;
					result: ErrorReturn<FPR>;
					aggregate: T extends { pipe: PType }
						? PrettifyHardcore<{
								result: ErrorReturn<Flatten<FPR>>;
								next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchema<PType> : never) : never;
							}>[]
						: never;
				}>
		: never;

type IsEmptyObject<T> = keyof T extends never ? true : false;

export function fetchAndParse<T extends DataSchemaDefinition<T, any>>(dsd: T, runtimeArguments: ExtractRuntimeArgumentsFromDSD<T>): Promise<DataSchema<T>>;

export function fetchAndParse<T extends DataSchemaDefinition<T, any>>(
	dsd: T,
): IsEmptyObject<ExtractRuntimeArgumentsFromDSD<T>> extends true ? Promise<DataSchema<T>> : never;

export async function fetchAndParse<T extends DataSchemaDefinition<T, any>>(dsd: T, runtimeArguments?: ExtractRuntimeArgumentsFromDSD<T>): Promise<DataSchema<T>> {
	const currentPipe = dsd;
	const currentResult = {};
	const runtimeArgs = (runtimeArguments ?? {}) as Record<string, unknown>;
	await fetchAndParseInternal(runtimeArgs, currentPipe, currentResult, [null, null], "");
	return currentResult as DataSchema<T>;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
async function fetchAndParseInternal(
	runtimeArguments: Record<string, unknown>,
	currentPipe: Record<string, Record<string, unknown>>,
	currentResult: Record<string, Record<string, unknown>>,
	parentFetchParserErrorReturn: ErrorReturn<unknown>,
	currentDebugPath: string,
): Promise<void> {
	const pipeNames = Object.keys(currentPipe);
	const [parentFetchParserReturn, parentFetchParserError] = parentFetchParserErrorReturn;

	for (const pipeName of pipeNames) {
		const entry = currentPipe[pipeName] as {
			as: FetchParserFunctionInternal<any, any, any, any, any, any> & Partial<AggregateFunctionOptions>;
			optional?: boolean;
			pipe?: any;
		};
		const entryDebugPath = `${currentDebugPath} > ${pipeName}`;

		const fetchParser = entry.as;

		const resultEntry: Record<string, unknown> = {};
		let resultEntryProcessed = true;

		let fetchParserReturn: any = null;
		let fetchParserError: any = null;

		if (parentFetchParserError) {
			fetchParserReturn = null;
			fetchParserError = parentFetchParserError;
		} else if (currentResult[pipeName]) {
			// When a resultEntry has been created it means that this entry has been processed.
			// One entry can be processed once.
			fetchParserError = new Error(`Fetch parser tried processing two array entries from it's parent. Debug path: ${entryDebugPath}`);
		} else if (fetchParser === typeNoopFunction) {
			fetchParserReturn = parentFetchParserReturn;
			fetchParserError = parentFetchParserError;

			// Noop function executed successfully.
			resultEntryProcessed = true;
		} else if (fetchParser.isAggregate) {
			// ==================================================
			// Aggregation support
			const aggregateArguments = Array.isArray(parentFetchParserReturn) ? parentFetchParserReturn : [parentFetchParserReturn];

			resultEntry["dataUsed"] = aggregateArguments;
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
					fetchParserError = new Error(`Fetch parser tried processing more than one array entry from it's parent. Debug path: ${entryDebugPath}`);
					break;
				}

				isProcessed = true;
				resultEntry["dataUsed"] = parentFetchParserReturnItem;
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
			resultEntry["dataUsed"] = parentFetchParserReturn;
			[fetchParserReturn, fetchParserError] = await fetchParser(parentFetchParserReturn, runtimeArguments);
			if (fetchParserReturn === false) {
				resultEntryProcessed = false;
			}
			// ==================================================
		}

		if (!resultEntryProcessed && !fetchParserError) {
			if (entry.optional) {
				continue;
			}
			fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
		}

		currentResult[pipeName] = resultEntry;
		const nextPipe = entry.pipe;
		resultEntry["result"] = [fetchParserReturn, fetchParserError];
		if (!nextPipe) {
			continue;
		}
		if (Object.keys(nextPipe).length === 0) {
			throw new Error(`Logical DSD error. This error is not caused by bad data. The pipe object cannot be empty ${entryDebugPath}`);
		}

		if (fetchParser.produceAggregateObjet) {
			const aggregate: any[] = [];
			resultEntry["aggregate"] = aggregate;
			if (fetchParserReturn) {
				if (!Array.isArray(fetchParserReturn)) {
					throw new Error(
						`Logical DSD error. This error is not caused by bad data. Fetch parser did not return an array but it is an aggregate function. ${entryDebugPath}`,
					);
				}

				const fetchAndParseInternalExecutorPromises: Promise<void>[] = [];
				for (let i = 0; i < fetchParserReturn.length; i++) {
					const fetchAndParseInternalExecutorPromise = (async (iteration: number) => {
						const fetchParserReturnItem = fetchParserReturn[iteration];
						const result = {};
						await fetchAndParseInternal(runtimeArguments, nextPipe, result, [fetchParserReturnItem, null], `${entryDebugPath}[${iteration}]`);
						aggregate[iteration] = {
							next: result,
							result: [fetchParserReturnItem, null],
						};
					})(i);
					fetchAndParseInternalExecutorPromises.push(fetchAndParseInternalExecutorPromise);
				}

				await Promise.all(fetchAndParseInternalExecutorPromises);
			}
		} else {
			resultEntry["next"] = {};
			await fetchAndParseInternal(
				runtimeArguments,
				nextPipe,
				resultEntry["next"] as Record<string, Record<string, unknown>>,
				[fetchParserReturn, fetchParserError],
				entryDebugPath,
			);
		}
	}
}

type ExtractAllDataSchemaNodes<DSD> =
	DSD extends DataSchemaDefinition<any, any>
		? {
				[K in keyof DSD]: DSD[K] extends { pipe: infer P } ? DSD[K] | (P extends DataSchemaDefinition<any, any> ? ExtractAllDataSchemaNodes<P> : never) : DSD[K];
			}[keyof DSD]
		: never;

export type RemovePipeAtCutPoints<DSD, CutPoints> =
	DSD extends DataSchemaDefinition<any, any>
		? {
				[K in keyof DSD]: DSD[K] extends CutPoints
					? PrettifyHardcore<Omit<DSD[K], "pipe">>
					: DSD[K] extends { pipe: infer P }
						? DSD[K] extends { pipe: DataSchemaDefinition<any, any> }
							? PrettifyHardcore<Omit<DSD[K], "pipe"> & { pipe: PrettifyHardcore<RemovePipeAtCutPoints<P, CutPoints>> }>
							: DSD[K]
						: DSD[K];
			}
		: never;

const CUT_POINT_DONE_KEY = "_DSD_INTERNAL_CUT_POINT_DONE";
export function cutoffDataSchemaDefinition<
	const T extends DataSchemaDefinition<T, any>,
	const CutPoint extends ExtractAllDataSchemaNodes<T>,
	const CutPoints extends readonly CutPoint[],
>(originalDSD: T, cutPointNodes: CutPoints): RemovePipeAtCutPoints<T, CutPoints[number]> {
	// TODO: Figure out if this deep clone is deep enough... We had problems with errorBoundary
	const clonedDSD = deepClone(originalDSD);

	const cutPoints = cutPointNodes as unknown as Record<string, unknown>[];
	for (const cutPoint of cutPoints) {
		modifyDSD(originalDSD, clonedDSD, cutPoint as Record<string, unknown>);
	}

	for (const cutPoint of cutPoints) {
		if (!cutPoint[CUT_POINT_DONE_KEY]) {
			throw new Error(
				`Logical error. Error you provided more cut points than necessary. We errored when trying to process this cut point:\n${JSON.stringify(cutPoint, null, 2)}`,
			);
		}

		delete cutPoint[CUT_POINT_DONE_KEY];
	}

	const shallowDSD = clonedDSD as unknown as RemovePipeAtCutPoints<T, CutPoints[number]>;
	return shallowDSD;
}

function modifyDSD(
	originalDSD: Record<string, Record<string, unknown>>,
	clonedDSD: Record<string, Record<string, unknown>> | undefined,
	cutPoint: Record<string, unknown>,
): void {
	if (cutPoint[CUT_POINT_DONE_KEY]) {
		return;
	}

	if (!clonedDSD) {
		throw new Error(`Error you provided cut points where one is their parent. We errored when trying to process this cut point:\n${JSON.stringify(cutPoint, null, 2)}`);
	}

	const pipeKeys = Object.keys(originalDSD);
	for (const pipeKey of pipeKeys) {
		const original = originalDSD[pipeKey] as Record<string, unknown>;
		const cloned = clonedDSD[pipeKey] as Record<string, unknown>;

		if (original === cutPoint) {
			if (original[CUT_POINT_DONE_KEY]) {
				throw new Error(`Error you provided more cut points than necessary. We errored when trying to process this cut point:\n${JSON.stringify(cutPoint, null, 2)}`);
			}

			cutPoint[CUT_POINT_DONE_KEY] = true;
			delete cloned["pipe"];
			continue;
		}

		if (original[CUT_POINT_DONE_KEY]) {
			continue;
		}

		if (!original["pipe"]) {
			continue;
		}

		modifyDSD(original["pipe"] as Record<string, Record<string, unknown>>, cloned["pipe"] as Record<string, Record<string, unknown>>, cutPoint);
	}
}

export type DataSchemaErrorBounded<T extends DataSchemaDefinition<T, any>> = {
	[K in keyof T as T[K] extends { optional: true } ? never : K]: DataSchemaNodeErrorBounded<T[K]>;
} & {
	[K in keyof T as T[K] extends { optional: true } ? K : never]?: DataSchemaNodeErrorBounded<T[K]>;
};

export type DataSchemaNodeErrorBounded<T> = T extends { as: NoopFunction; pipe?: infer PType }
	? { next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchemaErrorBounded<PType> : never) : never }
	: T extends { as: FetchParserFunctionInternal<infer pFPR, infer FPR, any, any, infer ProducesAggregateObject, any>; pipe?: infer PType }
		? ProducesAggregateObject extends false
			? PrettifyHardcore<{
					dataUsed?: PrettifyHardcore<pFPR>;
					result: FPR;
					next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType, any> ? DataSchemaErrorBounded<PType> : never) : never;
				}>
			: PrettifyHardcore<{
					dataUsed?: PrettifyHardcore<pFPR>;
					result: FPR;
					aggregate: T extends { pipe: PType }
						? PrettifyHardcore<{
								result: Flatten<FPR>;
								next: PType extends Record<string, Record<string, any>>
									? PType extends DataSchemaDefinition<PType, any>
										? DataSchemaErrorBounded<PType>
										: never
									: never;
							}>[]
						: never;
				}>
		: never;

export type DataSchemaToDataSchemaErrorBounded<DS> = DS extends DataSchema<infer DSD extends Record<string, any>> ? DataSchemaErrorBounded<DSD> : never;
// export type DataSchemaNodeToDataSchemaNodeErrorBounded<DSN> = DSN extends DataSchemaNode<infer DSDN> ? DataSchemaNodeErrorBounded<DSDN> : never;

export function dataSchemaErrorBoundary<T extends DataSchemaDefinition<T, any>, DS extends DataSchema<T>>(
	originalDataSchema: DS,
): ErrorReturn<DataSchemaToDataSchemaErrorBounded<DS>, AggregateError> {
	const errorsSet: Set<Error> = new Set();

	const dataSchema = structuredClone(originalDataSchema);
	for (const dataSchemaNode of Object.values(dataSchema)) {
		dataSchemaErrorBoundaryRecursive(dataSchemaNode, errorsSet);
	}

	if (errorsSet.size > 0) {
		const errors = [...errorsSet.values()];
		const errorMessage = `${errors.map((e) => e.message).join("\n")}`;
		return [null, new AggregateError(errors, errorMessage)];
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
	if (value === null || typeof value !== "object") {
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
			if (Object.hasOwn(value, key)) {
				cloned[key] = deepClone(value[key]);
			}
		}
		return cloned as T;
	}

	// For other object types (classes, etc.), return as-is
	// This prevents errors with complex objects that shouldn't be cloned
	return value;
}
