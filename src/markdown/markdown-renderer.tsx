// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import "server-only";

import type { JSX } from "react";
import { MarkdownAsync, type Options, defaultUrlTransform as reactMarkdownDefaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CstdError } from "@/error/cstd-error.jsx";
import { StaticImage } from "@/media/image/static-image.jsx";

export type Props = Options & {
	/** Layout contract used to build responsive candidates for Markdown images. */
	imageSizes: string;
};

/**
 * https://h.corioders.com/cstd-next/markdown-renderer
 */
export function MarkdownRenderer({ imageSizes, urlTransform, remarkPlugins, ...props }: Props): JSX.Element {
	const components = { ...getDefaultComponents(imageSizes), ...props.components };
	props.components = components;
	return <MarkdownAsync remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]} urlTransform={urlTransform ?? defaultUrlTransform} {...props} />;
}

function getDefaultComponents(imageSizes: string): Props["components"] {
	return {
		img: (imgProps) => {
			if (!imgProps.src) {
				return <CstdError error={new Error("Expected `src` prop on image")} />;
			}

			if (typeof imgProps.src !== "string") {
				return <CstdError error={new Error("Expected imgProps.src to be a string")} />;
			}

			return <StaticImage alt={imgProps.alt ?? ""} loading="lazy" sizes={imageSizes} src={imgProps.src} />;
		},
	};
}

function defaultUrlTransform(value: string) {
	if (value.startsWith("data:image")) {
		return value;
	}
	return reactMarkdownDefaultUrlTransform(value);
}
