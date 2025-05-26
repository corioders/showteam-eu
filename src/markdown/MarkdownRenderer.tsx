// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import 'server-only';

import CstdError from '@/error/CstdError.jsx';
import RemoteStaticImage from '@/media/image/RemoteStaticImage.jsx';
import type { JSX } from 'react';
import { MarkdownAsync, type Options, defaultUrlTransform as reactMarkdownDefaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type Props = Options;

/**
 * https://h.corioders.com/cstd-next/markdown-renderer
 */
export default function MarkdownRenderer({ urlTransform, remarkPlugins, ...props }: Props): JSX.Element {
	const components = { ...defaultComponents, ...props.components };
	props.components = components;
	return <MarkdownAsync remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]} urlTransform={urlTransform ?? defaultUrlTransform} {...props} />;
}

const defaultComponents: Props['components'] = {
	img: (imgProps) => {
		if (!imgProps.src) {
			return <CstdError error={new Error('Expected `src` prop on image')} />;
		}

		return <RemoteStaticImage src={imgProps.src} alt={imgProps.alt ?? 'TODO NO ALT'} loading="lazy" sizes="TODO SIZES" />;
	},
};

function defaultUrlTransform(value: string) {
	if (value.startsWith('data:image')) {
		return value;
	}
	return reactMarkdownDefaultUrlTransform(value);
}
