// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { ImgHTMLAttributes } from 'react';

export type ImageType =
	| 'avif'
	| 'dz'
	| 'fits'
	| 'gif'
	| 'heif'
	| 'input'
	| 'jpeg'
	| 'jpg'
	| 'jp2'
	| 'jxl'
	| 'png'
	| 'ppm'
	| 'raw'
	| 'svg'
	| 'tiff'
	| 'tif'
	| 'v'
	| 'webp';

export const IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES: ImgHTMLAttributes<HTMLImageElement> = {
	loading: 'lazy',
	decoding: 'async',
};

export const TARGET_IMAGE_FORMATS: ImageType[] = ['avif', 'webp'];
export const TARGET_IMAGE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048];

export function getListOfScaledWidths(originalSize: number) {
	return [originalSize, originalSize * 2, originalSize * 3];
}
