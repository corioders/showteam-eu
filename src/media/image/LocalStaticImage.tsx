// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import './../../../src/media/image/picture-display-style.css';

import type { DetailedHTMLProps, ImgHTMLAttributes, JSX } from 'react';

import { memoizeImages } from './cache.js';
import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from './image.mjs';
import { validateSizesProperty } from './internalClient.mjs';
import type { INTERNAL_LocalStaticImageImport, LocalStaticImageImport as LocalStaticImageImportInternal } from './webpack-loader/localStaticImageLoader.mjs';

export type LocalStaticImageImport = LocalStaticImageImportInternal;

export interface LocalStaticImageProps
	extends Omit<DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src' | 'alt' | 'sizes' | 'width' | 'height'> {
	src: LocalStaticImageImport;
	alt: string;
	loading: 'eager' | 'lazy';
	sizes?: string;
	pictureClassName?: string;
}

// TODO: Error message when the user requested width does not match the actual with of the image at runtime. Bounding box etc...

/**
 * https://h.corioders.com/cstd-next/images#localstaticimage
 */

const LocalStaticImage = memoizeImages(function LocalStaticImage(props: LocalStaticImageProps) {
	const src = props.src as INTERNAL_LocalStaticImageImport;

	const userImagePropsIncorrectType: Partial<LocalStaticImageProps> = {
		...props,
	};

	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImagePropsIncorrectType.src;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImagePropsIncorrectType.alt;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImagePropsIncorrectType.loading;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImagePropsIncorrectType.sizes;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImagePropsIncorrectType.pictureClassName;

	const userImageProps = userImagePropsIncorrectType as ImgHTMLAttributes<HTMLImageElement>;

	const imageOptimizationAttributes = {
		...IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES,
		alt: props.alt,
		loading: props.loading,

		width: src.w,
		height: src.h,
	};

	if (src.g) {
		return (
			<picture className={props.pictureClassName}>
				<img {...imageOptimizationAttributes} {...userImageProps} src={src.g} alt={props.alt} />
			</picture>
		);
	}

	if (!src.s) {
		throw new Error('Either src.g OR src.s is required');
	}

	imageOptimizationAttributes.sizes = validateSizesProperty(props.sizes, src.z, src.filename);

	const sources: JSX.Element[] = [];
	for (const source of src.s) {
		const sourceKey = `${src.contentHash}${source.t}`;
		sources.push(<source key={sourceKey} sizes={imageOptimizationAttributes.sizes} srcSet={source.s} src={source.r} type={source.t} />);
	}

	const defaultImageFallbackSource = src.s[0];
	return (
		<picture className={props.pictureClassName}>
			{sources}
			<img {...imageOptimizationAttributes} {...userImageProps} srcSet={defaultImageFallbackSource.s} src={defaultImageFallbackSource.r} alt={props.alt} />
		</picture>
	);
});

export default LocalStaticImage;
