// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

export type TSError<ErrorMessage extends string> = ErrorMessage & { readonly __tsErrorTag: unique symbol };

export type ErrorReturn<Result, ErrorT = Error> = [Result, null] | [null, ErrorT];
export type ErrorReturnPromise<Result, ErrorT = Error> = Promise<ErrorReturn<Result, ErrorT>>;

export type ErrorReturnResult<ErrorReturnT extends ErrorReturn<any, any>> = ErrorReturnT extends [infer ResultT, null] ? ResultT : never;

export function safe<T>(throwableFn: () => T): ErrorReturn<T> {
	try {
		return [throwableFn(), null];
	} catch (error) {
		return [null, error as Error];
	}
}

export async function safePromise<T, ErrorT = Error>(throwableFn: () => Promise<T>): ErrorReturnPromise<T, ErrorT> {
	try {
		return [await throwableFn(), null];
	} catch (error) {
		return [null, error as ErrorT];
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

export function errorIs(error: Error, target: Error): boolean {
	if (error == null || target == null) {
		return error === target;
	}

	return errorIsInternal(error, target);
}

function errorIsInternal(error: Error, target: Error): boolean {
	if (error === target) {
		return true;
	}

	if (error instanceof AggregateError) {
		for (const err of error.errors) {
			if (err instanceof Error && errorIsInternal(err, target)) {
				return true;
			}
		}

		return true;
	}

	if ("cause" in error && error.cause instanceof Error) {
		return errorIsInternal(error.cause, target);
	}

	return false;
}

export function unreachableErrorMessage(userMessage: string): string {
	return `'!!UNREACHABLE!! CONTACT CODE OWNER !!UNREACHABLE!! ${userMessage}`;
}

export function errorArrayToAggregateError(errors: Error[], additionalMessage?: string): AggregateError {
	let errorMessage = `${errors.map((e) => e.message).join("\n")}`;
	if (additionalMessage) {
		errorMessage = `${additionalMessage}\n${errorMessage}`;
	}

	return new AggregateError(errors, errorMessage);
}
