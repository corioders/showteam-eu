import type { DocMd } from '@/driveCMS/docs.js';
import { MarkdownFrontmatterParser, type ParsedMarkdownFrontmatter } from '@/format/markdown/frontmatter.js';
import type { StringMarkdown } from '@/format/markdown/index.js';
import { MarkdownKeyValueParser, type ParsedMarkdownValue } from '@/format/markdown/key-value.js';
import { defineTypeFunction } from '../index.js';

interface MarkdownKeyValueParserUserSpec {
	childHeaderLevel: number;
	allowDuplicateKeys?: boolean;
}

export const typeMarkdownKeyValueRootFromGoogleDocParser = defineTypeFunction<MarkdownKeyValueParserUserSpec, DocMd, ParsedMarkdownValue[]>(
	function typeMarkdownKeyValueRootFromGoogleDocParser(us) {
		return (docMd) => {
			return typeMarkdownKeyValueRootParser(us)(docMd.docMd);
		};
	},
);

export const typeMarkdownKeyValueRootParser = defineTypeFunction<MarkdownKeyValueParserUserSpec, StringMarkdown, ParsedMarkdownValue[]>(
	function typeMarkdownKeyValueRootParser(us) {
		return (stringMarkdown) => {
			console.log(stringMarkdown);
			const [parsedMarkdown, parseError] = MarkdownKeyValueParser(stringMarkdown, { headerLevel: us.childHeaderLevel, allowDuplicateKeys: us.allowDuplicateKeys });
			if (parseError) {
				return [null, parseError];
			}

			return [parsedMarkdown.parsedMarkdownValues, null];
		};
	},
);

export interface MarkdownKeyUserSpec {
	name: string;
}

export const typeMarkdownKeyValueParser = defineTypeFunction<MarkdownKeyValueParserUserSpec & MarkdownKeyUserSpec, ParsedMarkdownValue, ParsedMarkdownValue[]>(
	function typeMarkdownKeyValueParser(us) {
		return (parsedMarkdownValue) => {
			if (parsedMarkdownValue.key !== us.name) {
				return [false, null];
			}

			return typeMarkdownKeyValueRootParser(us)(parsedMarkdownValue.valueMarkdown);
		};
	},
);

export const typeMarkdownKeyValue = defineTypeFunction<MarkdownKeyUserSpec, ParsedMarkdownValue, ParsedMarkdownValue>(function typeMarkdownKeyValue(us) {
	return (parsedMarkdownValue) => {
		if (parsedMarkdownValue.key !== us.name) {
			return [false, null];
		}
		return [parsedMarkdownValue, null];
	};
});

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface MarkdownFrontmatterParserUserSpec {}

export const typeMarkdownFrontmatterRootFromGoogleDocParser = defineTypeFunction<MarkdownFrontmatterParserUserSpec, DocMd, ParsedMarkdownFrontmatter>(
	function typeMarkdownFrontmatterRootFromGoogleDocParser(us) {
		return (docMd) => {
			return typeMarkdownFrontmatterRootParser(us)(docMd.docMd);
		};
	},
);

export const typeMarkdownFrontmatterRootParser = defineTypeFunction<MarkdownFrontmatterParserUserSpec, StringMarkdown, ParsedMarkdownFrontmatter>(
	function typeMarkdownFrontmatterRootParser(_us) {
		return (stringMarkdown) => {
			const [parsedMarkdown, parseError] = MarkdownFrontmatterParser(stringMarkdown);
			if (parseError) {
				return [null, parseError];
			}

			return [parsedMarkdown, null];
		};
	},
);

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const typeMarkdownFrontmatterContent = defineTypeFunction<{}, ParsedMarkdownFrontmatter, StringMarkdown>(function typeMarkdownFrontmatterContent(_us) {
	return (parsedMarkdown) => {
		return [parsedMarkdown.content, null];
	};
});

export interface ParsedFrontmatterValue {
	key: string;
	value: string;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const typeMarkdownFrontmatter = defineTypeFunction<{}, ParsedMarkdownFrontmatter, ParsedFrontmatterValue[]>(function typeMarkdownFrontmatter(_us) {
	return (parsedMarkdown) => {
		const frontmatterValues: ParsedFrontmatterValue[] = [...parsedMarkdown.frontmatter.mapping.entries()].map(([key, value]) => ({ key, value }));
		return [frontmatterValues, null];
	};
});

export interface FrontmatterKeyUserSpec {
	name: string;
}

export const typeMarkdownFrontmatterKey = defineTypeFunction<FrontmatterKeyUserSpec, ParsedFrontmatterValue, ParsedFrontmatterValue>(
	function typeMarkdownFrontmatterKey(us) {
		return (parsedFrontmatterValue) => {
			if (parsedFrontmatterValue.key !== us.name) {
				return [false, null];
			}
			return [parsedFrontmatterValue, null];
		};
	},
);
