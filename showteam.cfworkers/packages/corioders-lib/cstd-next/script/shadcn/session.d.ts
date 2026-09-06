import type { SpawnSyncReturns } from "node:child_process";

export interface RunOptions {
	allowFailure?: boolean;
	capture?: boolean;
	cwd?: string;
	input?: string;
}

export const NORMALIZED_EXTENSIONS: Set<string>;
export function loadLocalEnvironment(cwd: string): void;
export function run(command: string, args: string[], options?: RunOptions): SpawnSyncReturns<string>;
export function snapshotFiles(root: string): Map<string, string>;
export function changedFiles(before: Map<string, string>, after: Map<string, string>): string[];
export function compatibilityTestPath(registryItem: string): string;
export function fileHash(filePath: string): string | null;
export function getSessionDirectory(cwd: string): string;
export function replaceDirectory(directory: string): void;
export function copyFiles(root: string, relativePaths: string[], destination: string): void;
