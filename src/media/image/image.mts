// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

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

// Don not ask me why I need to create this type... Stupid typescript.
export const IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES: { loading: 'lazy'; decoding: 'async' } = {
	loading: 'lazy',
	decoding: 'async',
};

export const IMAGE_FORMATS: ImageType[] = ['avif', 'webp'];
export const IMAGE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048];
