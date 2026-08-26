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

export const SHADCN_CODEMODS = [
	{
		name: "preserve-upstream-throw",
		transform: addNoThrowSuppressions,
	},
];

export function normalizeShadcnSource(source, filePath) {
	if (!SOURCE_EXTENSIONS.has(path.extname(filePath))) {
		return source;
	}
	return SHADCN_CODEMODS.reduce((currentSource, codemod) => codemod.transform(currentSource, filePath), source);
}
