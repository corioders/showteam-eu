// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { ErrorReturn, ErrorReturnPromise } from '@/error/index.js';
import type { Flatten } from '@/type/index.js';

export type FetchParserPromiseReturn<FPR> = ErrorReturnPromise<FPR | false>;
export type FetchParserReturn<FPR> = ErrorReturn<FPR | false>;

type FetchParserFunction<pFPR, FPR> = (parentFetchParserReturn: pFPR) => FetchParserReturn<FPR> | FetchParserPromiseReturn<FPR>;
export type TypeFunction<US, pFPR, FPR, _ProducesAggregateObject> = (userSpecification: US) => FetchParserFunction<pFPR, FPR>;

export function defineTypeFunction<US, pFPR, FPR, TF = TypeFunction<US, pFPR, FPR, false>>(tf: TF): TF {
	return tf;
}

export function defineTypeAggregateFunction<US, pFPR, FPR, TF = TypeFunction<US, pFPR[], FPR[], true>>(filterFunction: (x: Flatten<pFPR>) => boolean, tf: TF): TF {
	const modifiedTF = tf as TF & { filter: (x: Flatten<pFPR>) => boolean };
	modifiedTF.filter = filterFunction;
	return modifiedTF;
}

export function defineTypeAggregateToSingleFunction<US, pFPR, FPR, TF = TypeFunction<US, pFPR[], FPR, false>>(filterFunction: (x: Flatten<pFPR>) => boolean, tf: TF): TF {
	const modifiedTF = tf as TF & { filter: (x: Flatten<pFPR>) => boolean };
	modifiedTF.filter = filterFunction;
	return modifiedTF;
}

type DataSchemaDefinition<T extends Record<string, Record<string, any>>> = {
	[K in keyof T]: DataSchemaDefinitionNode<T[K]>;
};

type DataSchemaDefinitionNode<T> = T extends { type: TypeFunction<infer US, any, any, any>; pipe?: infer PType }
	? { type: TypeFunction<US, any, any, any>; pipe?: PType extends Record<string, Record<string, any>> ? DataSchemaDefinition<PType> : never } & US
	: { type: TypeFunction<any, any, any, any>; pipe?: unknown };

export function defineDataSchema<const T extends DataSchemaDefinition<T>>(dsd: T): Readonly<T> {
	return Object.freeze(dsd);
}

export function defineDataSchemaNode<const T extends Record<string, any>>(dsd: T & DataSchemaDefinitionNode<T>): Readonly<T> {
	return Object.freeze(dsd);
}

export type DataSchema<T extends DataSchemaDefinition<T>> = {
	[K in keyof T]: DataSchemaNode<T[K]>;
};

export type DataSchemaNode<T> = T extends { type: TypeFunction<any, infer pFPR, infer FPR, infer ProducesAggregateObject>; pipe?: infer PType }
	? ProducesAggregateObject extends false
		? {
				dataUsed: pFPR;
				result: ErrorReturn<FPR>;
				next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType> ? DataSchema<PType> : never) : never;
			}
		: {
				dataUsed: pFPR;
				result: ErrorReturn<FPR>;
				aggregate: {
					result: ErrorReturn<Flatten<FPR>>;
					next: PType extends Record<string, Record<string, any>> ? (PType extends DataSchemaDefinition<PType> ? DataSchema<PType> : never) : never;
				}[];
			}
	: never;

export async function fetchAndParse<const T extends DataSchemaDefinition<T>>(dsd: T): ErrorReturnPromise<DataSchema<T>> {
	const currentPipe = dsd;
	const currentResult = {};
	const error = await fetchAndParseInternal(currentPipe, currentResult, [null, null], '');
	if (error) {
		return [null, error];
	}

	return [currentResult as DataSchema<T>, null];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
async function fetchAndParseInternal(
	currentPipe: Record<string, Record<string, unknown>>,
	currentResult: Record<string, Record<string, unknown>>,
	parentFetchParserErrorReturn: ErrorReturn<unknown>,
	currentDebugPath: string,
): Promise<Error | null> {
	const pipeNames = Object.keys(currentPipe);
	const [parentFetchParserReturn, parentFetchParserError] = parentFetchParserErrorReturn;

	for (const pipeName of pipeNames) {
		const entry = currentPipe[pipeName] as { type: TypeFunction<any, any, any, any> & { filter?: (x: any) => boolean }; pipe?: any };
		const entryDebugPath = `${currentDebugPath} > ${pipeName}`;

		const typeFactoryFunction = entry.type;

		// To be more specific it should be entry without the `pipe`
		const userSpecification = entry;

		// When a resultEntry has been created it means that this entry has been processed.
		// One entry can be processed once.
		if (currentResult[pipeName]) {
			return new Error(`Fetch parser tried processing two array entries from it's parent. Debug path: ${entryDebugPath}`);
		}

		currentResult[pipeName] = {};
		const resultEntry = currentResult[pipeName];

		let isFetchParserReturnAggregate = false;
		let fetchParserReturn: any = null;
		let fetchParserError: any = null;
		if (parentFetchParserError) {
			fetchParserReturn = null;
			fetchParserError = parentFetchParserError;
		} else {
			const fetchParser = typeFactoryFunction(userSpecification);

			if (Array.isArray(parentFetchParserReturn)) {
				// ==================================================
				// Aggregation support
				if (typeFactoryFunction.filter) {
					isFetchParserReturnAggregate = true;
					const aggregateArguments = parentFetchParserReturn.filter(typeFactoryFunction.filter);
					//  This entry type is unable to process this parentFetchParserReturn
					if (aggregateArguments.length === 0) {
						fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
					} else {
						resultEntry['dataUsed'] = aggregateArguments;
						[fetchParserReturn, fetchParserError] = await fetchParser(aggregateArguments);
						if (fetchParserReturn === false) {
							fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
						}
					}
					// ==================================================
				} else {
					// ==================================================
					// Our parent returned an array. We process exactly one item from it.
					let isProcessed = false;
					for (const parentFetchParserReturnItem of parentFetchParserReturn) {
						const [localFetchParserReturn, localFetchParserError] = await fetchParser(parentFetchParserReturnItem);
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
						fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
					}
					// ==================================================
				}
			} else {
				// ==================================================
				// Our parent returned single element.
				resultEntry['dataUsed'] = parentFetchParserReturn;
				[fetchParserReturn, fetchParserError] = await fetchParser(parentFetchParserReturn);
				if (fetchParserReturn === false) {
					fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
				}
				// ==================================================
			}
		}

		const nextPipe = entry.pipe;
		resultEntry['result'] = [fetchParserReturn, fetchParserError];
		if (!nextPipe) {
			continue;
		}
		if (Object.keys(nextPipe).length === 0) {
			return new Error(`The pipe object cannot be empty ${entryDebugPath}`);
		}

		if (isFetchParserReturnAggregate && fetchParserReturn && Array.isArray(fetchParserReturn)) {
			const aggregate: any = [];
			for (let i = 0; i < fetchParserReturn.length; i++) {
				const fetchParserReturnItem = fetchParserReturn[i];
				const result = {};
				await fetchAndParseInternal(nextPipe, result, [fetchParserReturnItem, null], `${entryDebugPath}[${i}]`);
				aggregate.push({
					result: [fetchParserReturnItem, null],
					next: result,
				});
			}
			resultEntry['aggregate'] = aggregate;
			continue;
		}

		resultEntry['next'] = {};
		await fetchAndParseInternal(nextPipe, resultEntry['next'] as Record<string, Record<string, unknown>>, [fetchParserReturn, fetchParserError], entryDebugPath);
	}

	return null;
}
