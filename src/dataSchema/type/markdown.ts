import type { DocMd } from '@/driveCMS/docs.js';
import { MarkdownFrontmatterParser, type ParsedMarkdownFrontmatter } from '@/format/markdown/frontmatter.js';
import type { StringMarkdown } from '@/format/markdown/index.js';
import { MarkdownKeyValueParser, type ParsedMarkdownValue } from '@/format/markdown/key-value.js';
import { defineTypeFunction } from '../index.js';

interface MarkdownKeyValueParserUserSpec {
	childHeaderLevel: number;
}

export const typeMarkdownKeyValueRootFromGoogleDocParser = defineTypeFunction<MarkdownKeyValueParserUserSpec, DocMd, ParsedMarkdownValue[]>((us) => {
	return (docMd) => {
		return typeMarkdownKeyValueRootParser(us)(docMd.docMd);
	};
});

export const typeMarkdownKeyValueRootParser = defineTypeFunction<MarkdownKeyValueParserUserSpec, StringMarkdown, ParsedMarkdownValue[]>((us) => {
	return (stringMarkdown) => {
		const [parsedMarkdown, parseError] = MarkdownKeyValueParser(stringMarkdown, { headerLevel: us.childHeaderLevel });
		if (parseError) {
			return [null, parseError];
		}

		const parsedMarkdownValues = Object.values(parsedMarkdown.mapping);
		return [parsedMarkdownValues, null];
	};
});

export interface MarkdownKeyUserSpec {
	name: string;
}

export const typeMarkdownKeyValueParser = defineTypeFunction<MarkdownKeyValueParserUserSpec & MarkdownKeyUserSpec, ParsedMarkdownValue, ParsedMarkdownValue[]>((us) => {
	return (parsedMarkdownValue) => {
		if (parsedMarkdownValue.key !== us.name) {
			return [false, null];
		}

		return typeMarkdownKeyValueRootParser(us)(parsedMarkdownValue.valueMarkdown);
	};
});

export const typeMarkdownKeyValue = defineTypeFunction<MarkdownKeyUserSpec, ParsedMarkdownValue, ParsedMarkdownValue>((us) => {
	return (parsedMarkdownValue) => {
		if (parsedMarkdownValue.key !== us.name) {
			return [false, null];
		}
		return [parsedMarkdownValue, null];
	};
});

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface MarkdownFrontmatterParserUserSpec {}

export const typeMarkdownFrontmatterRootFromGoogleDocParser = defineTypeFunction<MarkdownFrontmatterParserUserSpec, DocMd, ParsedMarkdownFrontmatter>((us) => {
	return (docMd) => {
		return typeMarkdownFrontmatterRootParser(us)(docMd.docMd);
	};
});

export const typeMarkdownFrontmatterRootParser = defineTypeFunction<MarkdownFrontmatterParserUserSpec, StringMarkdown, ParsedMarkdownFrontmatter>((_us) => {
	return (stringMarkdown) => {
		const [parsedMarkdown, parseError] = MarkdownFrontmatterParser(stringMarkdown);
		if (parseError) {
			return [null, parseError];
		}

		return [parsedMarkdown, null];
	};
});

export interface ParsedFrontmatterValue {
	key: string;
	value: string;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const typeMarkdownFrontmatter = defineTypeFunction<{}, ParsedMarkdownFrontmatter, ParsedFrontmatterValue[]>((_us) => {
	return (parsedMarkdown) => {
		const frontmatterValues: ParsedFrontmatterValue[] = [...parsedMarkdown.frontmatter.mapping.entries()].map(([key, value]) => ({ key, value }));
		return [frontmatterValues, null];
	};
});

export interface FrontmatterKeyUserSpec {
	name: string;
}

export const typeMarkdownFrontmatterKey = defineTypeFunction<FrontmatterKeyUserSpec, ParsedFrontmatterValue, ParsedFrontmatterValue>((us) => {
	return (parsedFrontmatterValue) => {
		if (parsedFrontmatterValue.key !== us.name) {
			return [false, null];
		}
		return [parsedFrontmatterValue, null];
	};
});
