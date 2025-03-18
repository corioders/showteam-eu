import 'server-only';

import { MarkdownAsync, type Options, defaultUrlTransform as reactMarkdownDefaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type Props = Options;


export default function MarkdownRenderer({ urlTransform, remarkPlugins, ...props }: Props) {
	return <MarkdownAsync remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]} urlTransform={urlTransform ?? defaultUrlTransform} {...props} />;
}

function defaultUrlTransform(value: string) {
	if (value.startsWith('data:image')) {
		return value;
	}
	return reactMarkdownDefaultUrlTransform(value);
}