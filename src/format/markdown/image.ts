// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import type { Definition, Nodes } from "mdast";
import { remark } from "remark";
import stripMarkdown from "strip-markdown";

import { type ErrorReturn, safe } from "@/error/index.js";

import type { StringMarkdown } from "./index.js";

function imageHandler(node: Definition): Nodes {
	return {
		type: "text",
		value: node.url,
	};
}

const MARKDOWN_IMAGE_TO_URL_PROCESSOR = remark().use(stripMarkdown, { remove: [["definition", imageHandler]] });
export function markdownImageStringToImageURL(markdownImageString: StringMarkdown): ErrorReturn<URL> {
	const [remarkFile, parseError] = safe(() => MARKDOWN_IMAGE_TO_URL_PROCESSOR.processSync(markdownImageString));
	if (parseError) {
		return [null, parseError];
	}

	const imageURL = new URL(String(remarkFile));
	return [imageURL, null];
}
