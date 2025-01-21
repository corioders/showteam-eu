// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import NextExportOptimizeLocalPicture from 'next-export-optimize-images/picture.js';
import type { ImageProps as ImagePropsNext, StaticImageData, StaticImport, StaticRequire } from 'next/dist/shared/lib/get-img-props';

import './picture-display-style.css';
import type { LocalImageSource } from './index.ts';

export type LocalImageProps = {
	src: LocalImageSource;
} & Omit<ImagePropsNext, 'src'>;

export default function LocalImage(props: LocalImageProps) {
	const nextImageProps = {
		...props,
		src: normalizeLocalImageSource(props.src),
	};

	if (nextImageProps.sizes === undefined) {
		nextImageProps.sizes = '100vh';
	}

	if (nextImageProps.src.blurDataURL !== undefined) {
		nextImageProps.placeholder = 'blur';
	}

	return <NextExportOptimizeLocalPicture {...nextImageProps} />;
}

function normalizeLocalImageSource(imageSource: LocalImageSource): StaticImageData {
	if (isStaticRequire(imageSource)) {
		return imageSource.default;
	}

	return imageSource;
}

function isStaticRequire(x: StaticImport): x is StaticRequire {
	if ('default' in x && typeof x.default === 'object') {
		return true;
	}

	return false;
}

export interface PreloadLocalImagesProps {
	sources: LocalImageSource[];
}

export function PreloadLocalImages(props: PreloadLocalImagesProps) {
	return (
		<div style={{ display: 'none' }}>
			{props.sources.map((sourceNotNormal) => {
				const source = normalizeLocalImageSource(sourceNotNormal);

				return (
					<LocalImage style={{ display: 'none' }} key={`PreloadLocalImages${source.src}`} src={source} alt={'PreloadRemoteImages'} loading="eager" priority={false} />
				);
			})}
		</div>
	);
}
