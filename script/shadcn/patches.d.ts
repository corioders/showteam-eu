export function registryItemsFromArguments(arguments_: string[]): string[];
export function readShadcnStyle(cwd: string): [string, null] | [null, Error];
export function learnedPatchPaths(patchDirectory: string, registryItem: string, style: string): { manifestPath: string; patchPath: string };

interface LearnedPatchOptions {
	baselineRoot: string;
	currentRoot: string;
	patchDirectory: string;
	registryItem: string;
	sourceFiles: string[];
	style: string;
	verificationTest: { hash: string; path: string };
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
	style: string;
}

export type ApplyPatchResult =
	| { status: "missing" }
	| { status: "applied"; changedFiles: string[] }
	| { status: "invalid" | "stale"; error: string }
	| { status: "unverified"; changedFiles: string[]; error: string };

export function applyLearnedPatch(options: ApplyPatchOptions): ApplyPatchResult;
