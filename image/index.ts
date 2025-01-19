// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import type { StaticImageData, StaticImport, StaticRequire } from 'next/dist/shared/lib/get-img-props';

export type ImageSource = string | StaticImport;

export function normalizeImageSource(imageSource: ImageSource): StaticImageData | string {
	if (typeof imageSource === 'string') {
		return imageSource;
	}

	if (isStaticRequire(imageSource)) {
		return imageSource.default;
	}

	return imageSource;
}

export function isStaticRequire(x: string | StaticImport): x is StaticRequire {
	if (typeof x === 'string') {
		return false;
	}

	if ('default' in x && typeof x.default === 'object') {
		return true;
	}

	return false;
}
