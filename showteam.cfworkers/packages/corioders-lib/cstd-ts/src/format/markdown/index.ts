// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { remark } from "remark";
import strip from "strip-markdown";

import { type ErrorReturn, safe } from "@/error/index.js";

export type StringMarkdown = string & { readonly __markdownTag: unique symbol };

const MARKDOWN_TO_PLAIN_TEXT_PROCESSOR = remark().use(strip);
export function markdownStringToPlainText(markdown: StringMarkdown): ErrorReturn<string> {
	const [remarkFile, parseError] = safe(() => MARKDOWN_TO_PLAIN_TEXT_PROCESSOR.processSync(markdown));
	if (parseError) {
		return [null, parseError];
	}

	const plainText = String(remarkFile);
	return [plainText, null];
}
