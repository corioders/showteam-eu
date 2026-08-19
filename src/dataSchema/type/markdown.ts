import type { DocMd } from "@/driveCMS/docs.js";
import { MarkdownFrontmatterParser, type ParsedMarkdownFrontmatter } from "@/format/markdown/frontmatter.js";
import type { StringMarkdown } from "@/format/markdown/index.js";
import { MarkdownKeyValueParser, type ParsedMarkdownValue } from "@/format/markdown/key-value.js";

import { defineTypeAggregateFunction, defineTypeFunction } from "../index.js";
import type { GoogleDriveInternationalizedDocMd } from "./drive-cms.js";

interface MarkdownKeyValueParserUserSpec {
	childHeaderLevel: number;
	allowDuplicateKeys?: boolean;
}

export const typeMarkdownKeyValueRootFromGoogleInternationalizedDocParser = defineTypeFunction<
	MarkdownKeyValueParserUserSpec,
	GoogleDriveInternationalizedDocMd,
	ParsedMarkdownValue[]
>(function typeMarkdownKeyValueRootFromGoogleDocParser(us) {
	return (intlDocMd) => {
		return typeMarkdownKeyValueRootParser(us)(intlDocMd.doc.docMd);
	};
});

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
			const [parsedMarkdown, parseError] = MarkdownKeyValueParser(stringMarkdown, { allowDuplicateKeys: us.allowDuplicateKeys, headerLevel: us.childHeaderLevel });
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

export type ParsedMarkdownValueArrayParent = ParsedMarkdownValue[] & { parent: ParsedMarkdownValue };

export const typeMarkdownKeyValueAggregateParser = defineTypeAggregateFunction<MarkdownKeyValueParserUserSpec, ParsedMarkdownValue, ParsedMarkdownValueArrayParent>(
	function typeMarkdownKeyValueParser(us) {
		return (parsedMarkdownValues) => {
			const doubleParsedMarkdownValues: ParsedMarkdownValueArrayParent[] = [];
			for (const parsedMarkdownValue of parsedMarkdownValues) {
				const [doubleParsedMarkdownValue, doubleParsedError] = typeMarkdownKeyValueRootParser(us)(parsedMarkdownValue.valueMarkdown);
				if (doubleParsedError) {
					return [null, doubleParsedError];
				}
				if (!doubleParsedMarkdownValue) {
					continue;
				}

				if (doubleParsedMarkdownValue.length === 0) {
					continue;
				}

				const doubleParsedMarkdownValueArrayParent = doubleParsedMarkdownValue as ParsedMarkdownValueArrayParent;
				doubleParsedMarkdownValueArrayParent.parent = parsedMarkdownValue;
				doubleParsedMarkdownValues.push(doubleParsedMarkdownValueArrayParent);
			}

			return [doubleParsedMarkdownValues, null];
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

// biome-ignore lint/suspicious/noConfusingVoidType: This void type is required for DSD to work as expected
type MarkdownFrontmatterParserUserSpec = void;

export const typeMarkdownFrontmatterRootFromGoogleInternationalizedDocParser = defineTypeFunction<
	MarkdownFrontmatterParserUserSpec,
	GoogleDriveInternationalizedDocMd,
	ParsedMarkdownFrontmatter
>(function typeMarkdownFrontmatterRootFromGoogleInternationalizedDocParser(us) {
	return (intlDocMd) => {
		return typeMarkdownFrontmatterRootParser(us)(intlDocMd.doc.docMd);
	};
});

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

export const typeMarkdownFrontmatterContent = defineTypeFunction<void, ParsedMarkdownFrontmatter, StringMarkdown>(function typeMarkdownFrontmatterContent(_us) {
	return (parsedMarkdown) => {
		return [parsedMarkdown.content, null];
	};
});

export interface ParsedFrontmatterValue {
	key: string;
	value: string;
}

export const typeMarkdownFrontmatter = defineTypeFunction<void, ParsedMarkdownFrontmatter, ParsedFrontmatterValue[]>(function typeMarkdownFrontmatter(_us) {
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
