import { ErrorReturn } from "@/error/index.js";
import { ParsedDSDTF, parseDSDTF } from "@/format/deadSimpleDataTextFormat/index.js";

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

	let [_empty, frontmatter, content] = docMd.split('\===');

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

	if (frontmatter.endsWith("\\")){
		frontmatter = frontmatter.slice(0, -1);
	}
	frontmatter = frontmatter.trim();

	const [dsdtf, error] = parseDSDTF(frontmatter.trim());
	if (error) {
		return [null, error];
	}

	const title = dsdtf.mapping.get('Title').trim();
	if (!title) {
		return [null, new Error('Title is not defined')];
	}

	const description = dsdtf.mapping.get('Description').trim();
	if (!description) {
		return [null, new Error('Description is not defined')];
	}

	if (!content) {
		return [null, new Error('No post content, check if you have added === to the end of the metadata')];
	}

	return [{ metadata: { title, description, other: dsdtf }, content }, null];
}
