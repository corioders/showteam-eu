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

export function errorIsInArray(error: Error, targets: Error[]): boolean {
	for (const target of targets) {
		if (errorIs(error, target)) {
			return true;
		}
	}

	return false;
}

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

export function errorToString(error: unknown): string {
	return errorToStringInternal(error, new WeakSet<object>());
}

function errorToStringInternal(error: unknown, visited: WeakSet<object>): string {
	if (!(error instanceof Error)) {
		return stringifyErrorValue(error);
	}

	if (visited.has(error)) {
		return "[Circular error]";
	}
	visited.add(error);

	const lines = [`${error.name}: ${error.message}`];
	const customProperties = getErrorCustomProperties(error, visited);

	if (customProperties.length > 0) {
		lines.push(...customProperties);
	}

	if (error instanceof AggregateError) {
		lines.push(
			"Aggregate errors:",
			...Array.from(error.errors, (aggregateError, index) => indentErrorString(`[${index}] ${errorToStringInternal(aggregateError, visited)}`)),
		);
	}

	if ("cause" in error && error.cause !== undefined) {
		lines.push("Cause:", errorToStringInternal(error.cause, visited));
	}

	return lines.join("\n");
}

function getErrorCustomProperties(error: Error, visited: WeakSet<object>): string[] {
	const ignoredKeys = new Set(["cause", "message", "name", "stack", "errors"]);
	const propertyEntries: string[] = [];

	for (const key of Object.keys(error)) {
		if (ignoredKeys.has(key)) {
			continue;
		}

		const value = (error as unknown as Record<string, unknown>)[key];
		propertyEntries.push(`${key}: ${stringifyErrorValue(value, visited)}`);
	}

	return propertyEntries;
}

function stringifyErrorValue(value: unknown, visited?: WeakSet<object>): string {
	if (value instanceof Error) {
		return errorToStringInternal(value, visited ?? new WeakSet<object>());
	}

	if (typeof value === "string") {
		return value;
	}

	if (value === null || value === undefined) {
		return String(value);
	}

	if (typeof value !== "object") {
		return String(value);
	}

	if (visited?.has(value)) {
		return "[Circular value]";
	}

	visited?.add(value);

	try {
		const stringified = JSON.stringify(value);
		return stringified ?? String(value);
	} catch {
		return String(value);
	}
}

function indentErrorString(errorString: string): string {
	return errorString
		.split("\n")
		.map((line) => `  ${line}`)
		.join("\n");
}
