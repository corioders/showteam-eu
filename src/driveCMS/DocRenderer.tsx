import 'server-only';

import CstdError from '@/error/CstdError.jsx';

import MarkdownRenderer, { type Props as MarkdownRendererProps } from '@/markdown/MarkdownRenderer.jsx';
import type { DocID, DocMd } from 'cstd-ts/driveCMS/docs.js';
import { downloadDocLatestMarkdownDeployRevision, downloadDocLatestMarkdownRevision } from 'cstd-ts/driveCMS/index.js';
import type { ErrorReturn } from 'cstd-ts/error/index.js';

interface Props extends Omit<MarkdownRendererProps, 'children'> {
	docID: string;
	// biome-ignore lint/style/useNamingConvention: <explanation>
	IS_PREVIEW_ENV_NAME: string;
}

export default async function DocRenderer(props: Props) {
	const usePreviewRevision = process.env[props.IS_PREVIEW_ENV_NAME] === 'true';

	let mdDownload: ErrorReturn<DocMd>;

	if (usePreviewRevision) {
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