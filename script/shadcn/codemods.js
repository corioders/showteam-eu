import path from "node:path";

import ts from "typescript";

const NO_THROW_REASON = "Preserve upstream Shadcnblocks behavior; adapt only when project semantics require it.";
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const WHITESPACE_ONLY = /^[\t ]*$/;

function getScriptKind(filePath) {
	if (filePath.endsWith(".tsx")) {
		return ts.ScriptKind.TSX;
	}
	if (filePath.endsWith(".jsx")) {
		return ts.ScriptKind.JSX;
	}
	if (filePath.endsWith(".ts")) {
		return ts.ScriptKind.TS;
	}
	return ts.ScriptKind.JS;
}

function addNoThrowSuppressions(source, filePath) {
	const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
	const insertions = [];

	function visit(node) {
		if (ts.isThrowStatement(node)) {
			const start = node.getStart(sourceFile);
			const leadingText = source.slice(node.getFullStart(), start);
			if (!leadingText.includes("lint/plugin/no-throw")) {
				const lineStart = source.lastIndexOf("\n", start - 1) + 1;
				const beforeThrowOnLine = source.slice(lineStart, start);
				const comment = WHITESPACE_ONLY.test(beforeThrowOnLine)
					? `// biome-ignore lint/plugin/no-throw: ${NO_THROW_REASON}\n${beforeThrowOnLine}`
					: `/* biome-ignore lint/plugin/no-throw: ${NO_THROW_REASON} */ `;
				insertions.push({ comment, start });
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	let normalized = source;
	for (const insertion of insertions.toReversed()) {
		normalized = `${normalized.slice(0, insertion.start)}${insertion.comment}${normalized.slice(insertion.start)}`;
	}
	return normalized;
}

function insertBeforeClientDirective(source, lines) {
	if (lines.every((line) => source.includes(line))) {
		return source;
	}
	return source.replace('"use client";', `${lines.filter((line) => !source.includes(line)).join("\n")}\n"use client";`);
}

function adaptShadcnBaseUi(source, filePath) {
	if (filePath.endsWith("chart.tsx")) {
		let normalized = insertBeforeClientDirective(source, [
			"// biome-ignore-all lint/security/noDangerouslySetInnerHtml: Chart styles are derived only from the local ChartConfig supplied by application code.",
			"// biome-ignore-all lint/suspicious/noArrayIndexKey: Recharts payload entries do not expose a stable unique identifier.",
			"// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Tooltip rendering follows the upstream Recharts data model.",
		]);
		normalized = normalized.replace('import type { TooltipValueType } from "recharts";', 'import type { TooltipContentProps, TooltipValueType } from "recharts";');
		normalized = normalized.replace("React.ComponentProps<typeof RechartsPrimitive.Tooltip> &", "TooltipContentProps<TooltipValueType, TooltipNameType> &");
		return normalized.replaceAll("!colorConfig.length", "colorConfig.length === 0").replaceAll("!payload?.length", "payload === undefined || payload.length === 0");
	}

	if (filePath.endsWith("sidebar.tsx")) {
		return insertBeforeClientDirective(source, [
			"// biome-ignore-all lint/suspicious/noDocumentCookie: The state is intentionally persisted for seven days and the Cookie Store API is not supported in every target browser.",
		]);
	}

	if (filePath.endsWith("dashboard9.tsx")) {
		let normalized = insertBeforeClientDirective(source, [
			"// biome-ignore-all lint/performance/noImgElement: The upstream block uses a remote SVG logo; preserving its loading behavior avoids untrusted image-domain configuration.",
			"// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: The upstream dashboard keeps metric display decisions co-located with the data mapping.",
			"// biome-ignore-all lint/style/useNamingConvention: Order-status labels are external display values and must match their source strings.",
			"// biome-ignore-all lint/suspicious/noArrayIndexKey: Fulfillment progress is an immutable positional visualisation.",
		]);
		normalized = normalized.replace('import type { TooltipProps } from "recharts";', 'import type { TooltipContentProps } from "recharts";');
		normalized = normalized.replaceAll("}: TooltipProps<number, string> & {", "}: Partial<TooltipContentProps<number, string>> & {");
		normalized = normalized.replaceAll("isActive={item.isActive}", "isActive={item.isActive ?? false}");
		normalized = normalized.replaceAll("isActive={child.isActive}", "isActive={child.isActive ?? false}");
		normalized = normalized.replaceAll("item.children!.map", "item.children?.map");
		return normalized.replaceAll("!payload?.length", "payload === undefined || payload.length === 0");
	}

	return source;
}

export const SHADCN_CODEMODS = [
	{
		name: "preserve-upstream-throw",
		transform: addNoThrowSuppressions,
	},
	{
		name: "adapt-shadcn-base-ui",
		transform: adaptShadcnBaseUi,
	},
];

export function normalizeShadcnSource(source, filePath) {
	if (!SOURCE_EXTENSIONS.has(path.extname(filePath))) {
		return source;
	}
	return SHADCN_CODEMODS.reduce((currentSource, codemod) => codemod.transform(currentSource, filePath), source);
}
