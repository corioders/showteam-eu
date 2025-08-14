import "server-only";

import type { Doc } from "cstd-ts/driveCMS/docs.js";
import { type ParsedHeaderToKeyValue, parseDocAstToHeaderKeyValue } from "cstd-ts/driveCMS/docs-parser.js";
import { downloadDocLatestDeployRevision, downloadDocLatestRevision } from "cstd-ts/driveCMS/index.js";
import { doesMIMETypeMatch, MIMEType, type MIMETypeT } from "cstd-ts/driveCMS/resource.js";
import type { Child } from "cstd-ts/driveCMS/resourceStructureParser/index.js";
import type { ErrorReturn } from "cstd-ts/error/index.js";
import type { MapKey, MapValue } from "cstd-ts/type/index.js";
import type { ReactNode } from "react";

import { CstdError } from "@/error/cstd-error.jsx";
import { MarkdownRenderer } from "@/markdown/markdown-renderer.jsx";
import type { Children } from "@/type/index.js";

interface Components {
	item: (props: { itemKey: MapKey<ParsedHeaderToKeyValue["mapping"]>; itemValue: MapValue<ParsedHeaderToKeyValue["mapping"]> }) => ReactNode;
	root: (props: Children<ReactNode | ReactNode[]>) => ReactNode;
}

interface Props {
	doc: Child<MIMETypeT["docs"]>;

	components?: Partial<Components>;
}

const IS_PREVIEW = process.env.IS_PREVIEW === "true" || process.env.NEXT_PUBLIC_IS_PREVIEW === "true";

export async function HeaderKeyValueRenderer({ doc, ...props }: Props) {
	if (!doesMIMETypeMatch(MIMEType.docs, doc.resource.mimeType)) {
		return <CstdError error={new Error(`Expected a docs, but got ${doc.resource.mimeType}`)} />;
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

	const [keyValue, kvError] = parseDocAstToHeaderKeyValue(docContent.docAST);
	if (kvError) {
		return <CstdError error={kvError} />;
	}

	const components = { ...defaultComponents, ...props.components };

	const items: ReactNode[] = [];
	for (const [itemKey, itemValue] of keyValue.mapping) {
		items.push(<components.item itemKey={itemKey} itemValue={itemValue} key={`${doc.resource.id}-${itemKey}`} />);
	}

	return <components.root>{items}</components.root>;
}

const defaultComponents: Components = {
	item: (props) => (
		<div className="flex flex-col gap-2">
			<p className="font-bold">{props.itemKey}</p>
			<div className="flex-flex-col gap-2">
				<MarkdownRenderer>{props.itemValue}</MarkdownRenderer>
			</div>
		</div>
	),
	root: (props) => <section {...props} />,
} as const;
