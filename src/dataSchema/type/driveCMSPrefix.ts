// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { MetadataBase, ObjectWithMetadata } from '@/dataStructure/metadata.js';

import { GOOGLE_DRIVE_PUBLIC_PREFIX } from '@/driveCMS/const.js';
import { isCountryISO2Code, standardizeCountryISO2Code } from '@/internationalization/index.js';
import type { EmptyObject, PrettifyHardcore, UnionToIntersection } from '@/type/index.js';
import type { LanguageMetadata, OrderMetadata } from '../metadata/index.js';

export type ResourcePrefixParserFunctionReturn<Metadata extends MetadataBase> =
	| ({
			newResourceName: string;
	  } & ObjectWithMetadata<Metadata>)
	| false;

// ParseResourcePrefixFunction parses resourceName and returns resourceName without prefix
// If ParseResourcePrefixFunction returns false, this means that the resourceName does not satisfy the prefix
export type ResourcePrefixParserFunction<Metadata extends MetadataBase> = (resourceName: string) => ResourcePrefixParserFunctionReturn<Metadata>;

export interface ResourcePrefixParser<Metadata extends MetadataBase> {
	// 	userErrorPrefixTemplate is a string provided in an error when the prefix does not match.
	userErrorPrefixTemplate: string;
	userErrorMessage?: string;
	parser: ResourcePrefixParserFunction<Metadata>;
}

type ExtractMetadata<T extends ResourcePrefixParser<any>> = T extends ResourcePrefixParser<infer Metadata> ? Metadata : never;
type MergeMetadataInternal<ResourcePrefixParsers extends ResourcePrefixParser<any>[]> = PrettifyHardcore<
	UnionToIntersection<ExtractMetadata<ResourcePrefixParsers[number]>>
>;
type MergeMetadata<ResourcePrefixParsers extends ResourcePrefixParser<any>[]> = MergeMetadataInternal<ResourcePrefixParsers> extends MetadataBase
	? MergeMetadataInternal<ResourcePrefixParsers>
	: never;

// TODO: Merge metadata
export function MergeResourcePrefixParser<ResourcePrefixParsers extends ResourcePrefixParser<any>[], MergedMetadata extends MergeMetadata<ResourcePrefixParsers>>(
	parsers: ResourcePrefixParsers,
): ResourcePrefixParser<MergedMetadata> {
	return {
		userErrorPrefixTemplate: parsers.map((x) => x.userErrorPrefixTemplate).join(' '),
		userErrorMessage: parsers.map((x) => x.userErrorMessage).join('\n'),
		parser: (resourceName: string) => {
			let runningResourceName = resourceName;

			const mergedMetadata: MetadataBase = {};
			for (const parser of parsers) {
				const parserReturn = parser.parser(runningResourceName);
				if (!parserReturn) {
					return false;
				}

				runningResourceName = parserReturn.newResourceName;

				for (const [metadataKey, metadataValue] of Object.entries(parserReturn.metadata)) {
					if (mergedMetadata[metadataKey]) {
						throw new Error('Someone used the same key on the metadata object. Metadata object MUST use unique keys!');
					}

					mergedMetadata[metadataKey] = metadataValue;
				}
			}

			return {
				newResourceName: runningResourceName,
				metadata: mergedMetadata as MergedMetadata,
			};
		},
	};
}

export function StringResourcePrefixParserFactory(prefix: string): ResourcePrefixParser<EmptyObject> {
	return {
		userErrorPrefixTemplate: prefix,
		parser: (resourceName: string) => {
			if (resourceName.startsWith(prefix)) {
				return {
					newResourceName: resourceName.replace(prefix, '').trim(),
					metadata: {},
				};
			}

			return false;
		},
	};
}

export const NoPrefix: ResourcePrefixParser<EmptyObject> = {
	userErrorPrefixTemplate: 'no prefix required ',
	userErrorMessage: 'no prefix required',
	parser: (resourceName: string) => {
		return { newResourceName: resourceName, metadata: {} };
	},
};

export const LanguageResourcePrefixParser: ResourcePrefixParser<LanguageMetadata> = {
	userErrorPrefixTemplate: 'XX',
	userErrorMessage: 'Where XX is a 2 letter country code',
	parser: (resourceName: string) => {
		if (resourceName.length < 2) {
			return false;
		}

		const countryPrefix = resourceName.slice(0, 2).toLocaleLowerCase();
		const newResourceName = resourceName.slice(2, resourceName.length).trim();
		if (!isCountryISO2Code(countryPrefix)) {
			return false;
		}

		return {
			newResourceName,
			metadata: {
				countryCodeDS: standardizeCountryISO2Code(countryPrefix),
			},
		};
	},
};

export const OrderResourcePrefixParser: ResourcePrefixParser<OrderMetadata> = {
	userErrorPrefixTemplate: 'NN',
	userErrorMessage: 'Where NN is a number. Note that this number can be of any length, but must be positive.',
	parser: (resourceName: string) => {
		const prefixEnd = resourceName.indexOf(' ');

		const prefix = resourceName.slice(0, prefixEnd);
		const newResourceName = resourceName.slice(prefix.length, resourceName.length).trim();
		const orderingNumber = Number(prefix);
		if (Number.isNaN(orderingNumber)) {
			return false;
		}

		return {
			newResourceName,
			metadata: {
				orderNumberDS: orderingNumber,
			},
		};
	},
};

export const PublicPrefixParser = StringResourcePrefixParserFactory(GOOGLE_DRIVE_PUBLIC_PREFIX);
export const PublicLanguagePrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser]);
export const PublicOrderedPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, OrderResourcePrefixParser]);
export const PublicLanguageOrderPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser, OrderResourcePrefixParser]);
