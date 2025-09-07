// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import { newTypedSymbol } from "@/dataStructure/index.js";
import { type ErrorReturn, unreachableErrorMessage } from "@/error/index.js";
import { isASCII } from "@/string/index.js";

import type { Child, ChildMetadata } from "./index.js";

// ParseResourcePrefixFunction parses resourceName and returns resourceName without prefix
// If ParseResourcePrefixFunction returns false, this means that the resourceName does not satisfy the prefix
export type ResourcePrefixParserFunction = (resourceName: string, metadata: ChildMetadata) => string | false;
export interface ResourcePrefixParser {
	// 	userErrorPrefixTemplate is a string provided in an error when the prefix does not match.
	userErrorPrefixTemplate: string;
	userErrorMessage?: string;
	parser: ResourcePrefixParserFunction;
}

export function MergeResourcePrefixParser(parsers: ResourcePrefixParser[]): ResourcePrefixParser {
	return {
		parser: (resourceName: string, metadata: ChildMetadata) => {
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
		userErrorMessage: parsers.map((x) => x.userErrorMessage).join("\n"),
		userErrorPrefixTemplate: parsers.map((x) => x.userErrorPrefixTemplate).join(" "),
	};
}

export function StringResourcePrefixParserFactory(prefix: string): ResourcePrefixParser {
	return {
		parser: (resourceName: string, _: ChildMetadata) => {
			if (resourceName.startsWith(prefix)) {
				return resourceName.replace(prefix, "").trim();
			}

			return false;
		},
		userErrorPrefixTemplate: prefix,
	};
}

export type LanguagePrefix = string & { __tagLanguagePrefix: symbol };
// TODO: This should not be exported. But we need it for now. Fix.
export const LANGUAGE_METADATA_KEY = newTypedSymbol<LanguagePrefix>("LANGUAGE_METADATA_KEY");
export const LanguageResourcePrefixParser: ResourcePrefixParser = {
	parser: (resourceName: string, metadata: ChildMetadata) => {
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
			console.error(setError);
			return false;
		}

		return resourceName.replace(prefix, "").trim();
	},
	userErrorMessage: "Where XX is a 2 letter country code",
	userErrorPrefixTemplate: "XX",
};

export type OrderingPrefix = string & { __tagLanguage: symbol };
const ORDER_METADATA_KEY = newTypedSymbol<number>("ORDER_METADATA_KEY");
export const OrderResourcePrefixParser: ResourcePrefixParser = {
	parser: (resourceName: string, metadata: ChildMetadata) => {
		const prefixEnd = resourceName.indexOf(" ");

		const prefix = resourceName.slice(0, prefixEnd);
		const orderingNumber = Number(prefix);
		if (Number.isNaN(orderingNumber)) {
			return false;
		}

		metadata.setEntry(ORDER_METADATA_KEY, orderingNumber);

		return resourceName.replace(prefix, "").trim();
	},
	userErrorMessage: "Where NN is a number. Note that this number can be of any length, but must be positive.",
	userErrorPrefixTemplate: "NN",
};

// TODO: This type should not exist. We need to rethink the whole thing.
export interface ChildWithName {
	child: Child;
	name: string;
}

export function getOrderedChildren(children: ChildWithName[]): ErrorReturn<ChildWithName[]> {
	for (const childWithName of children) {
		const order = childWithName.child.metadata.getEntry(ORDER_METADATA_KEY);
		if (order === undefined) {
			throw new Error(`Order is undefined for child with name: ${childWithName.child.resource.name}`);
		}
	}

	const orderedChildren = children.slice();
	orderedChildren.sort((a, b) => {
		const aOrder = a.child.metadata.getEntry(ORDER_METADATA_KEY);
		const bOrder = b.child.metadata.getEntry(ORDER_METADATA_KEY);

		if (aOrder === null || bOrder === null) {
			throw new Error(unreachableErrorMessage("Order is undefined"));
		}

		return aOrder - bOrder;
	});

	return [orderedChildren, null];
}
