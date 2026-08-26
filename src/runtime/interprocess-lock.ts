import { mkdirSync, statSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { lock as implLock } from "proper-lockfile";

import { CSE, type ErrorReturn, type ErrorReturnPromise, safe, safePromise } from "@/error/index.js";
import { isFileNotExistsError } from "@/os/fs/index.js";
import type { FileOrFolderPath } from "@/os/path/index.js";

export interface InterprocessLockManager {
	newLock(lockName: string): InterprocessLock;
}

export interface InterprocessLockUnlock {
	unlock(): Promise<void>;
}

export interface InterprocessLock {
	lock(): Promise<InterprocessLockUnlock>;
}

function internalNewInterprocessLock(lockFilePath: string): InterprocessLock {
	const lock = async (): Promise<InterprocessLockUnlock> => {
		const unlockImpl = await implLock(lockFilePath, {
			realpath: false,
			retries: {
				factor: 1,
				forever: true,
				maxTimeout: 1000,
				minTimeout: 100,
			},
		});

		return { unlock: unlockImpl };
	};

	return { lock };
}

export const ERROR_NOT_A_DIRECTORY = new Error("The path you provided is not a folder");
export async function newInterprocessLockManager(folderPath: FileOrFolderPath): ErrorReturnPromise<InterprocessLockManager> {
	const [folderStats, errorStats] = await safePromise(() => stat(folderPath));
	if (folderStats && !folderStats.isDirectory()) {
		return [null, new CSE(ERROR_NOT_A_DIRECTORY)];
	}

	if (errorStats) {
		if (!isFileNotExistsError(errorStats)) {
			return [null, errorStats];
		}

		const [_, mkdirError] = await safePromise(() => mkdir(folderPath, { recursive: true }));
		if (mkdirError) {
			return [null, mkdirError];
		}
	}

	const newLock = (lockName: string): InterprocessLock => {
		const lockFilePath = join(folderPath, lockName);
		return internalNewInterprocessLock(lockFilePath);
	};

	return [{ newLock }, null];
}

export function newInterprocessLockManagerSync(folderPath: FileOrFolderPath): ErrorReturn<InterprocessLockManager> {
	const [folderStats, errorStats] = safe(() => statSync(folderPath));
	if (folderStats && !folderStats.isDirectory()) {
		return [null, new CSE(ERROR_NOT_A_DIRECTORY)];
	}

	if (errorStats) {
		if (!isFileNotExistsError(errorStats)) {
			return [null, errorStats];
		}

		const [_, mkdirError] = safe(() => mkdirSync(folderPath, { recursive: true }));
		if (mkdirError) {
			return [null, mkdirError];
		}
	}

	const newLock = (lockName: string): InterprocessLock => {
		const lockFilePath = join(folderPath, lockName);
		return internalNewInterprocessLock(lockFilePath);
	};

	return [{ newLock }, null];
}
