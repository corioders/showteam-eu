// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import 'server-only';

import NextExportOptimizeRemotePicture from 'next-export-optimize-images/remote-picture.js';
import type { ImageProps as ImagePropsNext } from 'next/dist/shared/lib/get-img-props';

import { imageSize } from 'cstd-ts/media/image/size.js';

import './picture-display-style.css';
import type { RemoteImageSource } from './index.ts';

export type RemoteImageProps = {
	src: RemoteImageSource;
} & Omit<ImagePropsNext, 'src'>;

export default async function RemoteImage(props: RemoteImageProps) {
	const nextImageProps = { ...props };

	if (!isValidURL(nextImageProps.src)) {
		throw new Error(`RemoteImage: The 'src' prop should be a remote image URL.`);
	}

	const [size, err] = await imageSize(nextImageProps.src);
	if (err !== null) {
		// TODO: fix error handling
		throw err;
	}

	if (nextImageProps.sizes === undefined) {
		nextImageProps.sizes = '100vw';
	}

	nextImageProps.width = size.width;
	nextImageProps.height = size.height;

	return <NextExportOptimizeRemotePicture {...nextImageProps} />;
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

export interface PreloadRemoteImagesProps {
	sources: RemoteImageSource[];
}

export function PreloadRemoteImages(props: PreloadRemoteImagesProps) {
	return (
		<div style={{ display: 'none' }}>
			{props.sources.map((source) => {
				return <RemoteImage style={{ display: 'none' }} key={`PreloadRemoteImages${source}`} src={source} alt={'PreloadRemoteImages'} loading="eager" priority={false} />;
			})}
		</div>
	);
}
