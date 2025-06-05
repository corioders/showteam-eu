// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import { TypedSymbolMap, newTypedSymbol } from '@/datastructure/index.js';
import { GOOGLE_DRIVE_PUBLIC_PREFIX } from '@/driveCMS/const.js';
import { isASCII } from '@/string/index.js';

// ParseResourcePrefixFunction parses resourceName and returns resourceName without prefix
// If ParseResourcePrefixFunction returns false, this means that the resourceName does not satisfy the prefix
export type ResourcePrefixParserFunction = (resourceName: string, metadata: TypedSymbolMap) => string | false;
export interface ResourcePrefixParser {
	// 	userErrorPrefixTemplate is a string provided in an error when the prefix does not match.
	userErrorPrefixTemplate: string;
	userErrorMessage?: string;
	parser: ResourcePrefixParserFunction;
}

export function MergeResourcePrefixParser(parsers: ResourcePrefixParser[]): ResourcePrefixParser {
	return {
		userErrorPrefixTemplate: parsers.map((x) => x.userErrorPrefixTemplate).join(' '),
		userErrorMessage: parsers.map((x) => x.userErrorMessage).join('\n'),
		parser: (resourceName: string, metadata: TypedSymbolMap) => {
			let parsed = resourceName;
			for (const parser of parsers) {
				const parserOutput = parser.parser(parsed, metadata);
				if (!parserOutput) {
					return false;
				}
				parsed = parserOutput;
			}
			return parsed;
		},
	};
}

export function NoPrefix(): ResourcePrefixParser {
	return {
		userErrorPrefixTemplate: 'no prefix required ',
		userErrorMessage: 'no prefix required',
		parser: (resourceName: string, metadata: TypedSymbolMap) => {
			return resourceName;
		},
	};
}

export function StringResourcePrefixParserFactory(prefix: string): ResourcePrefixParser {
	return {
		userErrorPrefixTemplate: prefix,
		parser: (resourceName: string, _: TypedSymbolMap) => {
			if (resourceName.startsWith(prefix)) {
				return resourceName.replace(prefix, '').trim();
			}

			return false;
		},
	};
}

export type LanguagePrefix = string & { __tagLanguagePrefix: symbol };
// TODO: This should not be exported. But we need it for now. Fix.
export const LANGUAGE_METADATA_KEY = newTypedSymbol<LanguagePrefix>('LANGUAGE_METADATA_KEY');
export const LanguageResourcePrefixParser: ResourcePrefixParser = {
	userErrorPrefixTemplate: 'XX',
	userErrorMessage: 'Where XX is a 2 letter country code',
	parser: (resourceName: string, metadata: TypedSymbolMap) => {
		if (resourceName.length < 2) {
			return false;
		}

		const prefix = resourceName.slice(0, 2);
		if (!isASCII(prefix)) {
			return false;
		}

		const languagePrefix = prefix as LanguagePrefix;
		const setError = metadata.setEntry(LANGUAGE_METADATA_KEY, languagePrefix);
		if (setError) {
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.error(setError);
			return false;
		}

		return resourceName.replace(prefix, '').trim();
	},
};

export type OrderingPrefix = string & { __tagLanguage: symbol };
const ORDER_METADATA_KEY = newTypedSymbol<number>('ORDER_METADATA_KEY');
export const OrderResourcePrefixParser: ResourcePrefixParser = {
	userErrorPrefixTemplate: 'NN',
	userErrorMessage: 'Where NN is a number. Note that this number can be of any length, but must be positive.',
	parser: (resourceName: string, metadata: TypedSymbolMap) => {
		const prefixEnd = resourceName.indexOf(' ');

		const prefix = resourceName.slice(0, prefixEnd);
		const orderingNumber = Number(prefix);
		if (Number.isNaN(orderingNumber)) {
			return false;
		}

		metadata.setEntry(ORDER_METADATA_KEY, orderingNumber);

		return resourceName.replace(prefix, '').trim();
	},
};

export const PublicPrefixParser = StringResourcePrefixParserFactory(GOOGLE_DRIVE_PUBLIC_PREFIX);
export const PublicLanguagePrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser]);
export const PublicOrderedPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, OrderResourcePrefixParser]);
export const PublicLanguageOrderPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser, OrderResourcePrefixParser]);
