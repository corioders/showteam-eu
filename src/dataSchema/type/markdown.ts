import type { DocMd } from '@/driveCMS/docs.js';
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

// export const typeMarkdownAggregateKeyValue = defineTypeAggregateFunction<void, ParsedMarkdownValue, ParsedMarkdownValue>((_us) => {
// 	return (parsedMarkdownValue) => {
// 		return [parsedMarkdownValue, null];
// 	};
// });
