// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import './picture-display-style.css';

import type { ImageProps as ImagePropsNext } from 'next/dist/shared/lib/get-img-props';

import NextExportOptimizeLocalPicture from 'next-export-optimize-images/picture.js';

import { type ImageSource, normalizeImageSource } from './index.ts';

export type ClientImageProps = {
	src: ImageSource;
} & Omit<ImagePropsNext, 'src'>;

export default function ClientImage(props: ClientImageProps) {
	if (typeof props.src === 'string') {
		throw new Error(
			`ClientImage: For remote images use the ServerImage component. To avoid running ServerImage on the client, pass it as a prop to the client-side component. Got: ${props.src}`,
		);
	}

	const nextImageProps = {
		...props,
		src: normalizeImageSource(props.src),
	};

	if (nextImageProps.sizes === undefined) {
		nextImageProps.sizes = '100vh';
	}

	if (typeof nextImageProps.src !== 'string') {
		if (nextImageProps.src.blurDataURL !== undefined) {
			nextImageProps.placeholder = 'blur';
		}
	}

	return <NextExportOptimizeLocalPicture {...nextImageProps} />;
}
