// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import './picture-display-style.css';

import 'server-only';

import type { ImageProps as ImagePropsNext } from 'next/dist/shared/lib/get-img-props';

import NextExportOptimizeLocalPicture from 'next-export-optimize-images/picture.js';
import NextExportOptimizeRemotePicture from 'next-export-optimize-images/remote-picture.js';

import { imageSize } from 'cstd-ts/media/image/size.js';

import { type ImageSource, normalizeImageSource } from './index.ts';

export type ImageProps = {
	src: ImageSource;
} & Omit<ImagePropsNext, 'src'>;

export default async function ServerImage(props: ImageProps) {
	const nextImageProps = {
		...props,
		src: normalizeImageSource(props.src),
	};

	if (nextImageProps.sizes === undefined) {
		nextImageProps.sizes = '100vh';
	}

	if (typeof nextImageProps.src === 'string') {
		if (!isValidURL(nextImageProps.src)) {
			throw new Error(`ServerImage: The 'src' prop should be either a remote image URL or a statically imported image. Got: ${nextImageProps.src}`);
		}

		const [size, err] = await imageSize(nextImageProps.src);
		if (err !== null) {
			// TODO: fix error handling
			throw err;
		}

		nextImageProps.width = size.width;
		nextImageProps.height = size.height;

		// The src is specified twice to make typescript happy.
		return <NextExportOptimizeRemotePicture {...nextImageProps} src={nextImageProps.src} />;
	}

	if (nextImageProps.src.blurDataURL !== undefined) {
		nextImageProps.placeholder = 'blur';
	}

	return <NextExportOptimizeLocalPicture {...nextImageProps} />;
}

function isValidURL(x: string): boolean {
	if (typeof x !== 'string') {
		return false;
	}

	try {
		new URL(x);
		return true;
	} catch {
		return false;
	}
}
