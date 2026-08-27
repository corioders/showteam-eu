export function registryItemsFromArguments(arguments_: string[]): string[];

interface LearnedPatchOptions {
	baselineRoot: string;
	currentRoot: string;
	patchDirectory: string;
	registryItem: string;
	sourceFiles: string[];
}

interface LearnedPatchResult {
	changedFiles: string[];
	manifestPath: string;
	patchPath: string;
}

export function writeLearnedPatch(options: LearnedPatchOptions): [LearnedPatchResult, null] | [null, Error];

interface ApplyPatchOptions {
	cwd: string;
	patchDirectory: string;
	registryItem: string;
}

export type ApplyPatchResult = { status: "missing" } | { status: "applied"; changedFiles: string[] } | { status: "invalid" | "stale"; error: string };

export function applyLearnedPatch(options: ApplyPatchOptions): ApplyPatchResult;
