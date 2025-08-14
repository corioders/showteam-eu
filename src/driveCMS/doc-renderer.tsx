// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import "server-only";

import type { DocID, DocMd } from "cstd-ts/driveCMS/docs.js";
import { downloadDocLatestMarkdownDeployRevision, downloadDocLatestMarkdownRevision } from "cstd-ts/driveCMS/index.js";
import type { ErrorReturn } from "cstd-ts/error/index.js";
import type { JSX } from "react";

import { CstdError } from "@/error/cstd-error.jsx";
import { MarkdownRenderer, type Props as MarkdownRendererProps } from "@/markdown/markdown-renderer.jsx";

interface Props extends Omit<MarkdownRendererProps, "children"> {
	docID: string;
}

const IS_PREVIEW = process.env.IS_PREVIEW === "true" || process.env.NEXT_PUBLIC_IS_PREVIEW === "true";

export async function DocRenderer(props: Props): Promise<JSX.Element> {
	let mdDownload: ErrorReturn<DocMd>;

	if (IS_PREVIEW) {
		mdDownload = await downloadDocLatestMarkdownRevision(props.docID as DocID);
	} else {
		mdDownload = await downloadDocLatestMarkdownDeployRevision(props.docID as DocID);
	}
	const [doc, errorDownload] = mdDownload;

	if (errorDownload !== null) {
		return <CstdError error={errorDownload} />;
	}

	return <MarkdownRenderer {...props}>{doc.docMd}</MarkdownRenderer>;
}
