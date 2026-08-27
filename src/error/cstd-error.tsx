// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { IS_PREVIEW } from "cstd-ts/const.js";
import { type ErrorReturn, errorToString } from "cstd-ts/error/index.js";
import type { ComponentProps, ReactNode } from "react";

interface Props extends ComponentProps<"pre"> {
	error: Error | string;
}

/**
 * https://h.corioders.com/cstd-next/cstd-error
 */
export function CstdError({ error, className = "", children, ...props }: Props): ReactNode {
	if (!IS_PREVIEW) {
		return null;
	}

	return (
		<pre className={`w-full max-w-lg whitespace-pre-wrap p-6 ${className}`} {...props}>
			<h1 className="mb-2 font-black text-3xl">ERROR:</h1>
			{children}
			<p className="text-wrap">{errorToString(error).replaceAll("\n", "\n\n")}</p>
		</pre>
	);
}

export function errorReturnHandler<T>(errorReturn: ErrorReturn<T>, component: (result: T) => ReactNode): ReactNode {
	const [result, error] = errorReturn;
	if (error) {
		return <CstdError error={error} />;
	}

	return component(result);
}
