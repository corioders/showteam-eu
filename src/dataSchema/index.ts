// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { ErrorReturn, ErrorReturnPromise } from '@/error/index.js';
type DataSchemaDefinition = any;
// type DataSchema<DSD> = SOME_TRANSFORMATION<DSD
type DataSchema<DSD> = any;

type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;

export type FetchParserPromiseReturn<FPR> = ErrorReturnPromise<FPR | false>;
export type FetchParserReturn<FPR> = ErrorReturn<FPR | false>;

type FetchParserFunction<pFPR, FPR> = (parentFetchParserReturn: pFPR) => FetchParserReturn<FPR> | FetchParserPromiseReturn<FPR>;
export type TypeFunction<UES, pFPR, FPR> = (userSpecification: UES) => FetchParserFunction<pFPR, FPR>;

export function defineTypeFunction<_pUES, _ppUES, pFPR, UES, FPR>(
	_parentTF: TypeFunction<_pUES, _ppUES, pFPR> | null,
	tf: TypeFunction<UES, Flatten<pFPR>, FPR>,
): TypeFunction<UES, Flatten<pFPR>, FPR> {
	return tf;
}

export function defineTypeAggregateFunction<_pUES, _ppUES, pFPR, UES, FPR>(
	_parentTF: TypeFunction<_pUES, _ppUES, pFPR> | null,
	filterFunction: (x: Flatten<pFPR>) => boolean,
	tf: TypeFunction<UES, Array<Flatten<pFPR>>, FPR>,
): TypeFunction<UES, Array<Flatten<pFPR>>, Flatten<FPR>> & { filter: (x: Flatten<pFPR>) => boolean } {
	const modifiedTF = tf as TypeFunction<UES, Array<Flatten<pFPR>>, Flatten<FPR>> & { filter: (x: Flatten<pFPR>) => boolean };
	modifiedTF.filter = filterFunction;
	return modifiedTF;
}

export function defineDataSchema<DSD extends DataSchemaDefinition>(dsd: DSD): DSD {
	return dsd;
}

export async function fetchAndParse<DSD extends DataSchemaDefinition>(dsd: DSD): ErrorReturnPromise<DataSchema<DSD>> {
	const currentPipe = dsd;
	const currentResult = {};
	await fetchAndParseInternal(currentPipe, currentResult, [null, null], '');

	return [currentResult, null];
}

async function fetchAndParseInternal(currentPipe, currentResult, parentFetchParserErrorReturn, currentDebugPath: string) {
	const pipeNames = Object.keys(currentPipe);
	const [parentFetchParserReturn, parentFetchParserError] = parentFetchParserErrorReturn;

	for (const pipeName of pipeNames) {
		const entry = currentPipe[pipeName];
		const entryDebugPath = `${currentDebugPath} > ${pipeName}`;

		const typeFactoryFunction = entry.type;

		// To be more specific it should be entry without the `pipe`
		const userSpecification = entry;

		// When a resultEntry has been created it means that this entry has been processed.
		// One entry can be processed once.
		if (currentResult[pipeName]) {
			throw new Error(`Fetch parser tried processing two array entries from it's parent. Debug path: ${entryDebugPath}`);
		}

		currentResult[pipeName] = {};
		const resultEntry = currentResult[pipeName];

		let isFetchParserReturnAggregate = false;
		let fetchParserReturn = null;
		let fetchParserError = null;
		if (parentFetchParserError) {
			fetchParserReturn = null;
			fetchParserError = parentFetchParserError;
		} else {
			const fetchParser = typeFactoryFunction(userSpecification);

			if (Array.isArray(parentFetchParserReturn)) {
				// Aggregation support
				if (typeFactoryFunction.filter) {
					isFetchParserReturnAggregate = true;
					const aggregateArguments = parentFetchParserReturn.filter(typeFactoryFunction.filter);
					//  This entry type is unable to process this parentFetchParserReturn
					if (aggregateArguments.length === 0) {
						fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
					} else {
						resultEntry.dataUsed = aggregateArguments;
						[fetchParserReturn, fetchParserError] = await fetchParser(aggregateArguments);
						if (fetchParserReturn === false) {
							fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
						}
					}
				} else {
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
						resultEntry.dataUsed = parentFetchParserReturnItem;
						fetchParserReturn = localFetchParserReturn;
						fetchParserError = localFetchParserError;
					}

					if (isProcessed === false) {
						fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
					}
				}
			} else {
				resultEntry.dataUsed = parentFetchParserReturn;
				[fetchParserReturn, fetchParserError] = await fetchParser(parentFetchParserReturn);
				if (fetchParserReturn === false) {
					fetchParserError = new Error(`Entry not processed: ${entryDebugPath}`);
				}
			}
		}

		resultEntry.result = [fetchParserReturn, fetchParserError];
		const nextPipe = entry.pipe;
		if (!nextPipe) {
			continue;
		}

		if (isFetchParserReturnAggregate) {
			resultEntry.next = [];
			if (fetchParserError) {
				await fetchAndParseInternal(nextPipe, resultEntry.next, [fetchParserReturn, fetchParserError], entryDebugPath);
				continue;
			}

			for (let i = 0; i < fetchParserReturn.length; i++) {
				const fetchParserReturnItem = fetchParserReturn[i];
				const result = {};
				await fetchAndParseInternal(nextPipe, result, [fetchParserReturnItem, null], `${entryDebugPath}[${i}]`);
				resultEntry.next.push(result);
			}

			continue;
		}

		resultEntry.next = {};
		await fetchAndParseInternal(nextPipe, resultEntry.next, [fetchParserReturn, fetchParserError], entryDebugPath);
	}
}

// const BLOG_DSD = defineDataSchema({
// 	root: {
// 		type: typeGoogleDriveRootFolder,
// 		prefix: PublicOrderedPrefixParser,
// 		folderID: '1agrvFosnFN1omUXpUZ2miF1dn-YbYwhN',
// 		pipe: {
// 			postFolder: {
// 				type: typeGoogleDriveFolder,
// 				prefix: PublicPrefixParser,
// 				pipe: {
// 					postImage: { type: typeGoogleDriveSingleImage },
// 					postDocument: { type: typeGoogleDriveSingleDoc, pipe: { parsed: { type: typeGoogleDriveSingleDocWithMetadata } } },
// 				},
// 			},
// 		},
// 	},
// });

// fetchAndParse(BLOG_DSD).then((x) => {
// 	const a = x[0];
// 	// // const root_result = a.root.result[0];

// 	console.log('#0');
// 	console.log(a.root.next.postFolder.next[0]);

// 	console.log('#1');
// 	console.log(a.root.next.postFolder.next[1]);

// 	// console.log(JSON.stringify(x, null, 2));
// });

// // ==================================================

// // const dsd = defineDataSchema({
// // 	root: {
// // 		type: typeGoogleDriveRootFolder, /// <- returns [hero, stats, speakers, venues, partners, events, gallery] etc....
// // 		folderID: '1DwajPCZYZjqTu36uZpvxpllJeNoKCIio',

// // 		pipe: {
// // 			posts: {
// // 				type: typeGoogleDriveFolderAggregate,
// // 				pipe: {
// // 					postImage: {
// // 						type: typeGoogleDriveImage,
// // 					},
// // 				},
// // 			},
// // 			// hero: {
// // 			// 	type: typeGoogleDriveFolder,
// // 			// 	folderName: 'F1',
// // 			// 	aa: 'F2',
// // 			// 	// pipe: {},
// // 			// },

// // 			// gallery: {
// // 			// 	type: typeGoogleDriveFolder,
// // 			// 	folderName: 'F1',
// // 			// 	// pipe: {},
// // 			// },

// // 			// speakers: {
// // 			// 	type: typeGoogleDriveFolder,
// // 			// 	folderName: 'speakers',
// // 			// 	pipe: {},
// // 			// },
// // 		},
// // 	},
// // });

// // fetchAndParse(dsd);

// // const b = fetchAndParse(dsd);
// // const [rootOK, rootError] = b.root;
// // if (rootError) {
// // 	...
// // }

// // const [heroOK, heroError] = rootOK.hero;
// // if

// // ==================================================

// // const dsd = defineDataSchema({
// // 	/* <---- #0 */
// // 	name_used_in_the_DS_object: {
// // 		/* <---- this this one ENTRY */
// // 		// this type function gives the scheme to this object
// // 		type: typeGoogleDriveFolder,

// // 		// but every entry has the property children, this is like the #0 object IT IS RECUSRIVE
// // 		children: {
// // 			RECURSIVE: {
// // 				// ....
// // 			},
// // 		},
// // 	},
// // });

// // const dsd = defineDataSchema({
// // 	mleko: {
// // 		type: typeGoogleDriveRootFolder,
// // 		id: 'root id'

// // 		children: dsd_galerri
// // 	}
// // })

// // const ds = fetchAndParse(dsd);
// // // no i to jest albo objekt dalej, albo talbica w zaleznosci od tego co zwraca parser
// // ds.name_used_in_the_DS_object;

// // // teraz to co zostało to jakiś passing tych rzeczy z tych fn typowych niżej
