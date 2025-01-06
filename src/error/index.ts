// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

export type ErrorReturn<Result> = [Result, null] | [null, Error];
export type ErrorReturnPromise<Result> = Promise<ErrorReturn<Result>>;

export function safe<T>(throwableFn: () => T): ErrorReturn<T> {
	try {
		return [throwableFn(), null];
	} catch (error) {
		return [null, error];
	}
}

export async function safePromise<T>(throwableFn: () => Promise<T>): ErrorReturnPromise<T> {
	try {
		return [await throwableFn(), null];
	} catch (error) {
		return [null, error];
	}
}

export class CaptureStackError extends Error {
	constructor(error: Error) {
		super(error.message);
		Error.captureStackTrace(this, CaptureStackError);

		this.cause = error;
	}
}
export const CSE = CaptureStackError;

export function ErrorIs(error: Error, target: Error): boolean {
	if (error == null || target == null) {
		return error === target;
	}

	return errorIs(error, target);
}

function errorIs(error: Error, target: Error): boolean {
	if (error === target) {
		return true;
	}

	if (error instanceof AggregateError) {
		for (const err of error.errors) {
			if (err instanceof Error && errorIs(err, target)) {
				return true;
			}
		}

		return true;
	}

	if ('cause' in error && error.cause instanceof Error) {
		return errorIs(error.cause, target);
	}

	return false;
}
