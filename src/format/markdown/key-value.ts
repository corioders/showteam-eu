// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { Root, RootContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { toString as markdownToString } from "mdast-util-to-string";
import { remark } from "remark";
import { CONTINUE, SKIP, visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { reporter } from "vfile-reporter";

import { CSE, type ErrorReturn, safe } from "@/error/index.js";

import type { StringMarkdown } from "./index.js";

export interface ParsedMarkdownValue {
	key: string;
	keyMarkdown: StringMarkdown;

	value: string;
	valueMarkdown: StringMarkdown;
}

export interface ParsedMarkdownKeyValue {
	parsedMarkdownValues: ParsedMarkdownValue[];
}

export const ERR_DUPLICATE_VALUES_ARRAY_TO_MAPPING = new Error("Tried converting duplicate values array to mapping. Do not pass allowDuplicateKeys to the parser.");
export function ParsedMarkdownValuesToMapping(parsedMarkdownValues: ParsedMarkdownValue[]): ErrorReturn<Record<string, ParsedMarkdownValue>> {
	const mapping: Record<string, ParsedMarkdownValue> = {};
	for (const value of parsedMarkdownValues) {
		if (mapping[value.key]) {
			return [null, new CSE(ERR_DUPLICATE_VALUES_ARRAY_TO_MAPPING)];
		}

		mapping[value.key] = value;
	}

	return [mapping, null];
}

export interface MarkdownParserSpec {
	headerLevel: number;
	allowDuplicateKeys?: boolean | undefined;
}
const FILE_DATA_KEY = "parsedMarkdownKeyValue";

export const ERR_DUPLICATE_KEYS = new Error("Duplicate keys are not allowed. Unless you pass allowDuplicateKeys to the parser.");
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
			nodes: RootContent[];
			keyMarkdown: StringMarkdown;
		}

		interface DuplicateMapValue {
			values: MapValue[];
			index: number;
		}

		const map: Record<string, DuplicateMapValue> = {};
		let currentKey: string | null = null;

		visit(tree, (node) => {
			if (node.type === "heading" && node.depth === options.headerLevel) {
				currentKey = markdownToString(node).trim();

				const value = {
					keyMarkdown: toMarkdown(node).trim() as StringMarkdown,
					nodes: [],
				};

				const currentMapValue = map[currentKey];
				if (currentMapValue) {
					if (options.allowDuplicateKeys) {
						currentMapValue.values.push(value);
						currentMapValue.index = 1;
					} else {
						throw new CSE(ERR_DUPLICATE_KEYS);
					}
				} else {
					map[currentKey] = {
						index: 0,
						values: [value],
					};
				}
				return SKIP;
			}

			if (currentKey) {
				const currentMapValue = map[currentKey];
				if (currentMapValue) {
					// We don't care about the true typescript type here.
					currentMapValue.values[currentMapValue.index]?.nodes.push(node as RootContent);
				}
				return SKIP;
			}

			return CONTINUE;
		});

		const markdownKeyValue: ParsedMarkdownKeyValue = { parsedMarkdownValues: [] };
		for (const [key, mapDuplicateValue] of Object.entries(map)) {
			for (const mapValue of mapDuplicateValue.values) {
				markdownKeyValue.parsedMarkdownValues.push({
					key: key,
					keyMarkdown: mapValue.keyMarkdown,
					value: markdownToString(mapValue.nodes).trim(),
					valueMarkdown: toMarkdown({ children: mapValue.nodes, type: "root" }).trim() as StringMarkdown,
				});
			}
		}

		file.data[FILE_DATA_KEY] = markdownKeyValue;
	};
}
