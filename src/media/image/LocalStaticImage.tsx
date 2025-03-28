// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import './../../../src/media/image/picture-display-style.css';

import type { ImgHTMLAttributes, JSX } from 'react';

import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from './image.mjs';
import type { INTERNAL_LocalStaticImageImport, LocalStaticImageImport as LocalStaticImageImportInternal } from './webpack-loader/localStaticImageLoader.mjs';

export type LocalStaticImageImport = LocalStaticImageImportInternal;

export interface LocalStaticImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'sizes' | 'width' | 'height'> {
	src: LocalStaticImageImport;
	alt: string;
	sizes?: string;
}

// TODO: Error message when the user requested width does not match the actual with of the image at runtime. Bounding box etc...
export default function LocalStaticImage(props: LocalStaticImageProps) {
	const src = props.src as INTERNAL_LocalStaticImageImport;

	const userImageProps: Partial<LocalStaticImageProps> = { ...props };

	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImageProps.src;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImageProps.alt;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete userImageProps.sizes;

	const imageOptimizationAttributes: ImgHTMLAttributes<HTMLImageElement> = {
		...IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES,
		width: src.w,
		height: src.h,
	};

	if (src.g) {
		return <img {...imageOptimizationAttributes} {...userImageProps} src={src.g} alt={props.alt} />;
	}

	if (!src.s) {
		throw new Error('Either src.g OR src.s is required');
	}

	if (props.sizes && src.z) {
		throw new Error('When you are importing using the resource query and you specified only one width OR height then setting sizes property is NOT necessary');
	}

	if (!(props.sizes || src.z)) {
		console.log('Sizes can be omitted ONLY when importing using the resource query and specifying only ONE width OR height');
		// throw new Error('Sizes can be omitted ONLY when importing using the resource query and specifying only ONE width OR height');
	}

	if (src.z) {
		imageOptimizationAttributes.sizes = src.z;
	}

	const sources: JSX.Element[] = [];
	for (const source of src.s) {
		const sourceKey = `${src.contentHash}${source.t}`;
		sources.push(<source key={sourceKey} srcSet={source.s} src={source.r} type={source.t} />);
	}

	const defaultImageFallbackSource = src.s[0];
	return (
		<picture>
			{sources}
			<img {...imageOptimizationAttributes} {...userImageProps} srcSet={defaultImageFallbackSource.s} src={defaultImageFallbackSource.r} alt={props.alt} />
		</picture>
	);
}
