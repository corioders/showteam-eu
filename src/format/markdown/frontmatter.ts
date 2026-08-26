// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { ErrorReturn } from "@/error/index.js";
import { type ParsedDSDTF, parseDSDTF } from "@/format/deadSimpleDataTextFormat/index.js";

import { markdownStringToPlainText, type StringMarkdown } from "./index.js";

export interface ParsedMarkdownFrontmatter {
	frontmatter: ParsedDSDTF;
	content: StringMarkdown;
}

export function MarkdownFrontmatterParser(markdown: StringMarkdown): ErrorReturn<ParsedMarkdownFrontmatter> {
	const [_empty, frontmatterRaw, content] = markdown.split("===");

	if (!frontmatterRaw) {
		return [
			null,
			new Error(`Frontmatter is not defined, add for example:
===
Title::: The title of the post
Description::: The short description of the post
===

to the beginning of the document.`),
		];
	}
	let frontmatter = frontmatterRaw.trim();
	if (frontmatter.endsWith("\\")) {
		frontmatter = frontmatter.slice(0, -1);
	}
	frontmatter = frontmatter.trim();

	const [frontmatterPain, frontmatterError] = markdownStringToPlainText(frontmatter as StringMarkdown);
	if (frontmatterError) {
		return [null, frontmatterError];
	}

	const [dsdtf, error] = parseDSDTF(frontmatterPain);
	if (error) {
		return [null, error];
	}

	if (!content) {
		return [null, new Error("No content. Check if you have added `===` to the end of the frontmatter.")];
	}

	return [
		{
			content: content as StringMarkdown,
			frontmatter: dsdtf,
		},
		null,
	];
}
