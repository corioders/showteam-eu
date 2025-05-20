// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import type { ErrorReturn } from '@/error/index.js';
import { type StringMarkdown, markdownStringToPlainText } from '@/format/markdown/index.js';
import type { TxtDocumentNode } from '@textlint/ast-node-types';

export interface ParseDocAstToHeaderKeyValueOptions {
	// Used to specify when to start parsing the document. Content before startingHeaderName will be ignored.
	// When not specified the parsing starts from the begging of the doc.
	startingHeaderName?: string;

	// The depth of the headers used for keys. Header 1 == depth 1, etc...
	// Default 1.
	keyHeaderDepth?: number;
}

export interface ParsedHeaderToKeyValue {
	readonly mapping: Map<string, StringMarkdown>;
}

export const ERR_MAPPING_EMPTY = new Error('Mapping is empty');

export function parseDocAstToHeaderKeyValue(docAST: TxtDocumentNode, options?: ParseDocAstToHeaderKeyValueOptions): ErrorReturn<ParsedHeaderToKeyValue> {
	const mapping = new Map();

	const keyHeaderDepth = options?.keyHeaderDepth ?? 1;

	const astChildren = docAST.children;
	function findNextKeyHeaderIndex(startIndex: number): number | null {
		for (let i = startIndex; i < astChildren.length; i++) {
			const currentChild = astChildren[i];
			if (currentChild.type === 'Header' && currentChild.depth === keyHeaderDepth) {
				return i;
			}
		}

		return null;
	}

	for (let i = 0; i < astChildren.length; i++) {
		const currentChild = astChildren[i];
		if (currentChild.type !== 'Header' || currentChild.depth !== keyHeaderDepth) {
			continue;
		}

		const headerChild = currentChild;
		const firstHeaderChild = headerChild.children[0];
		if (firstHeaderChild?.type !== 'Str') {
			return [null, new Error(`Expected the heading ${keyHeaderDepth} with text inside, got heading ${keyHeaderDepth} with ${firstHeaderChild.type}`)];
		}

		const headerText = firstHeaderChild.value;
		const key = headerText;

		const searchStartIndex = i + 1;
		const nextHeaderIndex = findNextKeyHeaderIndex(searchStartIndex);
		if (nextHeaderIndex) {
			i = nextHeaderIndex - 1;
		}

		const nextHeader = nextHeaderIndex !== undefined ? astChildren[nextHeaderIndex] : undefined;
		const [_headerChildRangeStart, headerChildRangeEnd] = headerChild.range;
		const [nextHeaderRangeStart, _nextHeaderRangeEnd] = nextHeader?.range ?? [docAST.range[1], 0];

		const markdownRangeStart = headerChildRangeEnd;
		const markdownRangeEnd = nextHeaderRangeStart;

		const markdownString = docAST.raw.slice(markdownRangeStart, markdownRangeEnd);
		mapping.set(key, markdownString);
	}

	if (mapping.size === 0) {
		return [null, new Error(`Unable to find any Header ${keyHeaderDepth} in the doc: ${ERR_MAPPING_EMPTY}`, { cause: ERR_MAPPING_EMPTY })];
	}

	const parsedHeaderToKeyValue: ParsedHeaderToKeyValue = {
		mapping: mapping,
	};

	return [parsedHeaderToKeyValue, null];
}

export function markdownMappingToPlainText(mapping: Map<string, StringMarkdown>): ErrorReturn<Map<string, string>> {
	const newMapping = new Map();

	for (const [key, markdownText] of mapping) {
		const [text, parsingError] = markdownStringToPlainText(markdownText);
		if (parsingError) {
			return [null, parsingError];
		}

		newMapping.set(key, text);
	}
	return [newMapping, null];
}
