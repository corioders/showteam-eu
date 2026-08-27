// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import path from "node:path";

import ts from "typescript";

interface TurbopackLoaderContext {
	cacheable(cacheable: boolean): void;
	resourcePath: string;
	resourceQuery: string;
}

const pageManifestLoader = function pageManifestLoader(this: TurbopackLoaderContext, source: string) {
	this.cacheable(true);

	if (this.resourceQuery !== "") {
		// biome-ignore lint/plugin/no-throw: A recursive page-wrapper transform must fail at the Turbopack loader boundary.
		throw new Error(`The cstd-next page manifest loader unexpectedly received query ${this.resourceQuery}.`);
	}

	const originalPageSpecifier = `./${path.basename(this.resourcePath)}?cstd-original`;
	const sourceFile = ts.createSourceFile(this.resourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	const isClientPage = hasUseClientDirective(sourceFile);
	return [
		'import { createElement, Fragment, Suspense } from "react";',
		`import OriginalPage from ${JSON.stringify(originalPageSpecifier)};`,
		...(isClientPage ? ['import { ClientPageRoot } from "next/dist/client/components/client-page.js";'] : []),
		'import { PrerenderedImageManifestSeed } from "cstd-next/media/image/prerendered-image-manifest.jsx";',
		'import { PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER } from "cstd-next/media/image/prerendered-image-resource.js";',
		`export * from ${JSON.stringify(originalPageSpecifier)};`,
		"export default function CstdPageManifestWrapper(props) {",
		"	return createElement(",
		"		Fragment,",
		"		null,",
		"		createElement(PrerenderedImageManifestSeed, { value: PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER }),",
		isClientPage
			? "		createElement(Suspense, { fallback: null }, createElement(ClientPageRoot, { Component: OriginalPage, serverProvidedParams: null })),"
			: "		createElement(OriginalPage, props),",
		"	);",
		"}",
	].join("\n");
};

function hasUseClientDirective(sourceFile: ts.SourceFile): boolean {
	for (const statement of sourceFile.statements) {
		if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) {
			return false;
		}
		if (statement.expression.text === "use client") {
			return true;
		}
	}
	return false;
}

// biome-ignore lint/style/noDefaultExport: Turbopack loader API requires a default export.
export default pageManifestLoader;
