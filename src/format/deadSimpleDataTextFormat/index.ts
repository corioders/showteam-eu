// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import type { ErrorReturn } from "@/error";

import { ParsingDSDTFError } from "./error.js";

/* 
### Specification:
0. Keys are suffixed with `:::`
1. The provided string must start with a Key.
2. A Key can follow a Key. This implies that we can have a key with an empty value (see point 3.).
3. Empty value is represented as an empty string.
4. Keys that are not present as undefined.
5. Keys, except the comment key, can occur only once.
6. Keys must start on new lines.
7. Every string is a valid list.
8. Lists separate items with `,`

### Example:

Title::: Test title of the talk

Description:::
This is a multi
line description
of the talk

List::: This, Is, An, Example, Of, A, List

Comment:::
This is a comment
*/

const KEY_SUFFIX = ":::";
const WHITESPACE = " ";
const NEW_LINE = "\n";
const ARRAY_SEPARATOR = ",";

const COMMENT_KEY = "Comment";

export interface ParsedDSDTF {
	readonly mapping: Map<string, string>;
}

function newParsedDSDTF(mapping: Map<string, string>): ParsedDSDTF {
	return { mapping: mapping };
}

export function getAsArray(parsedDSDTF: ParsedDSDTF, key: string): string[] | undefined {
	const value = parsedDSDTF.mapping.get(key);
	if (value === undefined) {
		return undefined;
	}

	return value.split(ARRAY_SEPARATOR);
}

// TODO(0):
// Provide great errors.

// TODO(1):
// Error on this case:
/*
KeyOne::: test1 test2 tes3
KeyTwo:::test4 test5 test6
*/
// This parses to only one key, as there is no space after key's two ":::"
// We could also error on every occurrence of ":::" except in the keys.

// const a = `

// mleko
// `;
// try {
// 	const [parsed, err] = parseDSDTF(a);
// 	console.log(err.message);
// } catch (e) {
// 	console.log(e);
// }

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This is a parser. Complexity is unavoidable.
export function parseDSDTF(dsdtfRaw: string): ErrorReturn<ParsedDSDTF> {
	const dsdtfTimed = dsdtfRaw.trim();
	const dsdtfNewLineSplit = dsdtfTimed.split(NEW_LINE);

	// The string provided is empty.
	if (dsdtfNewLineSplit.length === 0) {
		return [newParsedDSDTF(new Map()), null];
	}

	const firstToken = (dsdtfNewLineSplit[0] as string).split(WHITESPACE)[0] as string;
	if (!isTokenAKey(firstToken)) {
		return [null, new ParsingDSDTFError("First text line is not a valid key", `Try adding ${KEY_SUFFIX} here.`)];
	}

	const keyValueMapping = new Map<string, string>();
	function addKeyValuePairToMapping(key: string, value: string): Error | null {
		// Store the previous key-value pair. Skip comments.
		if (key !== null && isKeyACommentKey(key) === false) {
			if (keyValueMapping.has(key)) {
				return new Error(`${key} occurred multiple times`);
			}

			keyValueMapping.set(key, value);
		}

		return null;
	}

	let currentKey: string | null = null;
	let currentValue = "";
	let currentValueFirstIteration = false;

	for (const dsdtfLine of dsdtfNewLineSplit) {
		currentValue += NEW_LINE;

		const dsdtfLineWhitespaceSplit = (dsdtfLine as string).split(WHITESPACE);
		for (let j = 0; j < dsdtfLineWhitespaceSplit.length; j++) {
			const token = dsdtfLineWhitespaceSplit[j] as string;
			if (isTokenAKey(token)) {
				if (j !== 0) {
					return [null, new Error("New keys must start on a new line")];
				}

				// Remove tailing NEW_LINE character. The outer loop has no way of knowing that this token is a key.
				currentValue = currentValue.slice(0, currentValue.length - 1);

				if (currentKey !== null) {
					const error = addKeyValuePairToMapping(currentKey, currentValue);
					if (error !== null) {
						return [null, error];
					}
				}

				currentKey = stripKeySuffix(token);
				currentValue = "";
				currentValueFirstIteration = true;
				continue;
			}

			// Removes prefixing NEW_LINE in this scenario:
			/*
      ValueOfThisKeyStartsOnTheNewLine:::
      there is no NEW_LINE before this line
      the first NEW_LINE is before this line
      */
			if (j === 0 && currentValue === NEW_LINE) {
				currentValue = "";
			}

			// Do not append whitespace after we encounter next line && Do not append whitespace to the beginning of the currentValue.
			if (j !== 0 && !currentValueFirstIteration) {
				currentValue += WHITESPACE;
			}

			currentValue += token;
			if (currentValueFirstIteration) {
				currentValueFirstIteration = false;
			}
		}
	}

	if (currentKey !== null) {
		// Add the last key-value pair.
		const error = addKeyValuePairToMapping(currentKey, currentValue);
		if (error !== null) {
			return [null, error];
		}
	}

	return [newParsedDSDTF(keyValueMapping), null];
}

function isTokenAKey(token: string): boolean {
	return token.endsWith(KEY_SUFFIX) || token.endsWith(`${KEY_SUFFIX}${NEW_LINE}`);
}

function stripKeySuffix(key: string): string {
	let stripDelta = 0;
	if (key.at(-1) === NEW_LINE) {
		stripDelta++;
	}

	return key.slice(0, key.length - KEY_SUFFIX.length - stripDelta);
}

function isKeyACommentKey(key: string): boolean {
	return key === COMMENT_KEY;
}
