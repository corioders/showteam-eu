// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { JSX } from 'react';

interface Props {
	error: Error | string;
}

const IS_PREVIEW = process.env.IS_PREVIEW === 'true' || process.env.NEXT_PUBLIC_IS_PREVIEW === 'true';

export default function CstdError(props: Props): JSX.Element {
	if (!IS_PREVIEW) {
		return <></>;
	}

	return (
		<div>
			<h1 className="font-extrabold">ERROR:</h1>
			<p className="whitespace-pre-wrap break-words">{String(props.error)}</p>
		</div>
	);
}
