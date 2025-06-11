// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { type ErrorReturn, safe } from '@/error/index.js';
import { type ParsedDSDTF, parseDSDTF } from '@/format/deadSimpleDataTextFormat/index.js';
import { remark } from 'remark';
import strip from 'strip-markdown';

export type StringMarkdown = string & { readonly __markdownTag: unique symbol };
export interface MarkdownDocMetadata {
	title: string;
	description: string;
	other: ParsedDSDTF;
}

export interface MarkdownDoc {
	metadata: MarkdownDocMetadata;
	content: string;
}

export function parseMarkdownDocWithMetadata(docMd: string): ErrorReturn<MarkdownDoc> {
	let [_empty, frontmatter, content] = docMd.split('===');

	if (!frontmatter) {
		return [
			null,
			new Error(`Metadata is not defined, add
===
Title::: The title of the post
Description::: The short description of the post
===

to the beginning of the document.`),
		];
	}

	frontmatter = frontmatter.trim();

	if (frontmatter.endsWith('\\')) {
		frontmatter = frontmatter.slice(0, -1);
	}
	frontmatter = frontmatter.trim();

	const [dsdtf, error] = parseDSDTF(frontmatter.trim());
	if (error) {
		return [null, error];
	}

	const title = dsdtf.mapping.get('Title')?.trim();
	if (!title) {
		return [null, new Error('Title is not defined')];
	}

	const description = dsdtf.mapping.get('Description')?.trim();
	if (!description) {
		return [null, new Error('Description is not defined')];
	}

	if (!content) {
		return [null, new Error('No post content, check if you have added === to the end of the metadata')];
	}

	return [{ metadata: { title, description, other: dsdtf }, content }, null];
}

const MARKDOWN_TO_PLAIN_TEXT_PROCESSOR = remark().use(strip);
export function markdownStringToPlainText(markdown: StringMarkdown): ErrorReturn<string> {
	const [remarkFile, parseError] = safe(() => MARKDOWN_TO_PLAIN_TEXT_PROCESSOR.processSync(markdown));
	if (parseError) {
		return [null, parseError];
	}

	const plainText = String(remarkFile);
	return [plainText, null];
}
