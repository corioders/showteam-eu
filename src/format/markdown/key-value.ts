// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import { type ErrorReturn, safe } from '@/error/index.js';
import type { Root } from 'mdast';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString as markdownToString } from 'mdast-util-to-string';
import { remark } from 'remark';
import { CONTINUE, SKIP, visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { reporter } from 'vfile-reporter';
import type { StringMarkdown } from './index.js';

export interface ParsedMarkdownValue {
	key: string;
	keyMarkdown: StringMarkdown;

	value: string;
	valueMarkdown: StringMarkdown;
}

export interface ParsedMarkdownKeyValue {
	mapping: Record<string, ParsedMarkdownValue>;
}

export interface MarkdownParserSpec {
	headerLevel: number;
}
const FILE_DATA_KEY = 'parsedMarkdownKeyValue';

export function MarkdownKeyValueParser(markdown: StringMarkdown, spec: MarkdownParserSpec): ErrorReturn<ParsedMarkdownKeyValue> {
	const [file, errorParse] = safe(() => remark().use(remarkKeyValuePlugin, spec).processSync(markdown));
	if (errorParse) {
		return [null, errorParse];
	}

	if (file.messages.length > 0) {
		const fileErrorMessages = reporter(file);
		if (fileErrorMessages) {
			return [null, new Error(fileErrorMessages)];
		}
	}

	const markdownKeyValue = file.data[FILE_DATA_KEY] as ParsedMarkdownKeyValue;

	return [markdownKeyValue, null];
}

function remarkKeyValuePlugin(options: MarkdownParserSpec) {
	return (tree: Root, file: VFile) => {
		interface MapValue {
			nodes: any[];
			keyMarkdown: StringMarkdown;
		}

		const map: Record<string, MapValue> = {};
		let currentKey: string | null = null;

		visit(tree, (node) => {
			if (node.type === 'heading' && node.depth === options.headerLevel) {
				currentKey = markdownToString(node).trim();

				if (!map[currentKey]) {
					map[currentKey] = {
						keyMarkdown: toMarkdown(node).trim() as StringMarkdown,
						nodes: [],
					};
				}
				return SKIP;
			}
			if (currentKey && map[currentKey]) {
				map[currentKey]?.nodes.push(node);
				return SKIP;
			}

			return CONTINUE;
		});

		const markdownKeyValue: ParsedMarkdownKeyValue = { mapping: {} };
		for (const [key, mapValue] of Object.entries(map)) {
			markdownKeyValue.mapping[key] = {
				key: key,
				keyMarkdown: mapValue.keyMarkdown,
				value: markdownToString(mapValue.nodes).trim(),
				valueMarkdown: toMarkdown({ type: 'root', children: mapValue.nodes }).trim() as StringMarkdown,
			};
		}

		file.data[FILE_DATA_KEY] = markdownKeyValue;
	};
}
