// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import 'server-only';

import type { JSX } from 'react';
import { MarkdownAsync, type Options, defaultUrlTransform as reactMarkdownDefaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type Props = Options;

export default function MarkdownRenderer({ urlTransform, remarkPlugins, ...props }: Props): JSX.Element {
	return <MarkdownAsync remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]} urlTransform={urlTransform ?? defaultUrlTransform} {...props} />;
}

function defaultUrlTransform(value: string) {
	if (value.startsWith('data:image')) {
		return value;
	}
	return reactMarkdownDefaultUrlTransform(value);
}
