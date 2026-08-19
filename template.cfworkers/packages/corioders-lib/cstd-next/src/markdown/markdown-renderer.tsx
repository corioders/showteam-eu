// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import "server-only";

import type { JSX } from "react";
import { MarkdownAsync, type Options, defaultUrlTransform as reactMarkdownDefaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CstdError } from "@/error/cstd-error.jsx";
import { RemoteStaticImage } from "@/media/image/remote-static-image.jsx";

export type Props = Options;

/**
 * https://h.corioders.com/cstd-next/markdown-renderer
 */
export function MarkdownRenderer({ urlTransform, remarkPlugins, ...props }: Props): JSX.Element {
	const components = { ...defaultComponents, ...props.components };
	props.components = components;
	return <MarkdownAsync remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]} urlTransform={urlTransform ?? defaultUrlTransform} {...props} />;
}

const defaultComponents: Props["components"] = {
	img: (imgProps) => {
		if (!imgProps.src) {
			return <CstdError error={new Error("Expected `src` prop on image")} />;
		}

		if (typeof imgProps.src !== "string") {
			throw new Error("Expected imgProps.src to be a string");
		}

		return <RemoteStaticImage alt={imgProps.alt ?? "TODO NO ALT"} loading="lazy" sizes="TODO SIZES" src={imgProps.src} />;
	},
};

function defaultUrlTransform(value: string) {
	if (value.startsWith("data:image")) {
		return value;
	}
	return reactMarkdownDefaultUrlTransform(value);
}
