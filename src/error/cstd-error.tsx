// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { ErrorReturn } from "cstd-ts/error/index.js";
import type { ReactNode } from "react";

interface Props {
	error: Error | string;
}

const IS_PREVIEW = process.env.IS_PREVIEW === "true" || process.env.NEXT_PUBLIC_IS_PREVIEW === "true";

/**
 * https://h.corioders.com/cstd-next/cstd-error
 */
export function CstdError(props: Props): ReactNode {
	if (!IS_PREVIEW) {
		return null;
	}

	return (
		<div className="max-w-full">
			<h1 className="font-extrabold">ERROR:</h1>
			{/* TODO: Artala fix this overflow */}
			<pre className="max-w-screen overflow-scroll whitespace-pre-wrap break-words">{String(props.error)}</pre>
		</div>
	);
}

export function errorReturnHandler<T>(errorReturn: ErrorReturn<T>, component: (result: T) => ReactNode): ReactNode {
	const [result, error] = errorReturn;
	if (error) {
		return <CstdError error={error} />;
	}

	return component(result);
}
