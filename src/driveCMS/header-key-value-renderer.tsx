import CstdError from 'cstd-next/error/CstdError.js';
import MarkdownRenderer from 'cstd-next/markdown/MarkdownRenderer.js';
import type { Children } from 'cstd-next/type/index.js';
import type { Doc } from 'cstd-ts/driveCMS/docs.js';
import { type ParsedHeaderToKeyValue, parseDocAstToHeaderKeyValue } from 'cstd-ts/driveCMS/docsParser.js';
import { downloadDocLatestDeployRevision, downloadDocLatestRevision } from 'cstd-ts/driveCMS/index.js';
import { MIMEType } from 'cstd-ts/driveCMS/resource.js';
import { type FolderChild, getChildByMIMEType, isFolderChild } from 'cstd-ts/driveCMS/resourceStructureParser.js';
import type { ErrorReturn } from 'cstd-ts/error/index.js';
import type { MapKey, MapValue } from 'cstd-ts/type/index.js';
import type { ReactNode } from 'react';

interface Components {
	item: (props: { key: MapKey<ParsedHeaderToKeyValue['mapping']>; value: MapValue<ParsedHeaderToKeyValue['mapping']> }) => ReactNode;
	root: (props: Children<ReactNode | ReactNode[]>) => ReactNode;
}

interface Props<FolderChildren> {
	children: FolderChild<FolderChildren>;

	components: Partial<Components>;
}

const IS_PREVIEW = process.env.IS_PREVIEW === 'true' || process.env.NEXT_PUBLIC_IS_PREVIEW === 'true';

export async function HeaderKeyValueRenderer<FolderChildren>(props: Props<FolderChildren>) {
	const section = props.children;
	if (!isFolderChild(section)) {
		return <CstdError error={new Error('Expected a folder')} />;
	}

	const doc = getChildByMIMEType(section.children, MIMEType.docs);
	if (!doc) {
		return <CstdError error={new Error(`Missing doc in ${section.resource.name}`)} />;
	}

	let docDownload: ErrorReturn<Doc>;

	if (IS_PREVIEW) {
		docDownload = await downloadDocLatestRevision(doc.resource.id);
	} else {
		docDownload = await downloadDocLatestDeployRevision(doc.resource.id);
	}

	const [docContent, errorDownload] = docDownload;

	if (errorDownload) {
		return <CstdError error={errorDownload} />;
	}

	const [keyValue, kvError] = await parseDocAstToHeaderKeyValue(docContent.docAST);
	if (kvError) {
		return <CstdError error={kvError} />;
	}

	const components = { ...defaultComponents, ...props.components };

	const items: ReactNode[] = [];
	for (const [key, value] of keyValue.mapping) {
		items.push(<components.item key={key} value={value} />);
	}

	return <components.root>{items}</components.root>;
}

const defaultComponents: Components = {
	item: (props) => (
		<div className="flex flex-col gap-2">
			<p className="font-bold">{props.key}</p>
			<div className="flex-flex-col gap-2">
				<MarkdownRenderer>{props.value}</MarkdownRenderer>
			</div>
		</div>
	),
	root: (props) => <section {...props} />,
} as const;
