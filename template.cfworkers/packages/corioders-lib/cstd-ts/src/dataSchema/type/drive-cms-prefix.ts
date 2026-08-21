// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { MetadataBase, ObjectWithMetadata } from "@/dataStructure/metadata.js";
import { GOOGLE_DRIVE_PUBLIC_PREFIX } from "@/driveCMS/const.js";
import { isCountryISO2Code, standardizeCountryISO2Code } from "@/internationalization/index.js";
import type { EmptyObject, PrettifyHardcore, UnionToIntersection } from "@/type/index.js";

import type { LanguageMetadata, OrderMetadata } from "../metadata/index.js";

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
type MergeMetadata<ResourcePrefixParsers extends ResourcePrefixParser<any>[]> =
	MergeMetadataInternal<ResourcePrefixParsers> extends MetadataBase ? MergeMetadataInternal<ResourcePrefixParsers> : never;

// TODO: Merge metadata
export function MergeResourcePrefixParser<ResourcePrefixParsers extends ResourcePrefixParser<any>[], MergedMetadata extends MergeMetadata<ResourcePrefixParsers>>(
	parsers: ResourcePrefixParsers,
): ResourcePrefixParser<MergedMetadata> {
	return {
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
						return false;
					}

					mergedMetadata[metadataKey] = metadataValue;
				}
			}

			return {
				metadata: mergedMetadata as MergedMetadata,
				newResourceName: runningResourceName,
			};
		},
		userErrorMessage: parsers.map((x) => x.userErrorMessage).join("\n"),
		userErrorPrefixTemplate: parsers.map((x) => x.userErrorPrefixTemplate).join(" "),
	};
}

export interface StringResourcePrefixParserFactoryOptions {
	caseSensitive?: boolean;
	keepNonSpacedTextThatIsAttachedToPrefix?: boolean;
}
export function StringResourcePrefixParserFactory(prefix: string, options?: StringResourcePrefixParserFactoryOptions): ResourcePrefixParser<EmptyObject> {
	const caseInsensitive = !options?.caseSensitive;

	return {
		parser: (resourceName: string) => {
			let resourceNameForProcessing = resourceName;
			let prefixForProcessing = prefix;

			if (caseInsensitive) {
				resourceNameForProcessing = resourceName.toUpperCase();
				prefixForProcessing = prefix.toUpperCase();
			}

			if (resourceNameForProcessing.startsWith(prefixForProcessing)) {
				let resourceNameWithoutPrefix: string;

				// Remove the public prefix while keeping the original case.
				if (!options?.keepNonSpacedTextThatIsAttachedToPrefix) {
					const spaceIndex = resourceName.indexOf(" ");
					resourceNameWithoutPrefix = resourceName.slice(spaceIndex);
				} else {
					resourceNameWithoutPrefix = resourceName.slice(prefixForProcessing.length);
				}

				return {
					metadata: {},
					newResourceName: resourceNameWithoutPrefix.trim(),
				};
			}

			return false;
		},
		userErrorPrefixTemplate: prefix,
	};
}

export const NoPrefix: ResourcePrefixParser<EmptyObject> = {
	parser: (resourceName: string) => {
		return { metadata: {}, newResourceName: resourceName };
	},
	userErrorMessage: "no prefix required",
	userErrorPrefixTemplate: "no prefix required ",
};

export const LanguageResourcePrefixParser: ResourcePrefixParser<LanguageMetadata> = {
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
			metadata: {
				countryCodeDS: standardizeCountryISO2Code(countryPrefix),
			},
			newResourceName,
		};
	},
	userErrorMessage: "Where XX is a 2 letter country code",
	userErrorPrefixTemplate: "XX",
};

export const OrderResourcePrefixParser: ResourcePrefixParser<OrderMetadata> = {
	parser: (resourceName: string) => {
		const prefixEnd = resourceName.indexOf(" ");

		const prefix = resourceName.slice(0, prefixEnd);
		const newResourceName = resourceName.slice(prefix.length, resourceName.length).trim();
		const orderingNumber = Number(prefix);
		if (Number.isNaN(orderingNumber)) {
			return false;
		}

		return {
			metadata: {
				orderNumberDS: orderingNumber,
			},
			newResourceName,
		};
	},
	userErrorMessage: "Where NN is a number. Note that this number can be of any length, but must be positive.",
	userErrorPrefixTemplate: "NN",
};

export const PublicPrefixParser = StringResourcePrefixParserFactory(GOOGLE_DRIVE_PUBLIC_PREFIX);
export const PublicLanguagePrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser]);
export const PublicOrderedPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, OrderResourcePrefixParser]);
export const PublicLanguageOrderPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser, OrderResourcePrefixParser]);
