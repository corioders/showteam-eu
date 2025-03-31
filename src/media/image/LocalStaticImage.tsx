// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import './../../../src/media/image/picture-display-style.css';

import type { ImgHTMLAttributes, JSX } from 'react';

import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from './image.mjs';
import { validateSizesProperty } from './internal.mjs';
import type { INTERNAL_LocalStaticImageImport, LocalStaticImageImport as LocalStaticImageImportInternal } from './webpack-loader/localStaticImageLoader.mjs';

export type LocalStaticImageImport = LocalStaticImageImportInternal;

export interface LocalStaticImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'sizes' | 'width' | 'height'> {
	src: LocalStaticImageImport;
	alt: string;
	loading: 'eager' | 'lazy';
	sizes?: string;
	pictureClassName?: string;
}

// TODO: Error message when the user requested width does not match the actual with of the image at runtime. Bounding box etc...
export default function LocalStaticImage(props: LocalStaticImageProps) {
	const src = props.src as INTERNAL_LocalStaticImageImport;

	const userImagePropsIncorrectType: Partial<LocalStaticImageProps> = { ...props };

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
		sizes: validateSizesProperty(props.sizes, src.z),

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
}
