// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import './../../../src/media/image/picture-display-style.css';

import type { ImgHTMLAttributes, JSX } from 'react';

import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from './image.mjs';
import type { INTERNAL_LocalStaticImageImport, LocalStaticImageImport as LocalStaticImageImportInternal } from './webpack-loader/localStaticImageLoader.mjs';

export type LocalStaticImageImport = LocalStaticImageImportInternal;

// If user would like to provide with, the query parameter `?w=<number>` is the approach. Height is then inferred
export interface LocalStaticImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
	src: LocalStaticImageImport;
	alt: string;
}

// TODO: Error message when the user requested width does not match the actual with of the image at runtime. Bounding box etc...
export default function LocalStaticImage(props: LocalStaticImageProps) {
	const src = props.src as INTERNAL_LocalStaticImageImport;

	const rawImageProps = { ...props } as unknown as ImgHTMLAttributes<HTMLImageElement>;

	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.src;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.alt;

	const imageOptimizationAttributes = {
		...IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES,
		// TODO: Figure out correct sizes
		sizes: '100vw',
		width: src.w,
		height: src.h,
	};

	if (src.g) {
		return <img {...imageOptimizationAttributes} {...rawImageProps} src={src.g} alt={props.alt} />;
	}

	if (!src.s) {
		throw new Error('Either src.g OR src.s is required');
	}

	const sources: JSX.Element[] = [];
	for (const source of src.s) {
		const sourceKey = `${src.contentHash}${source.t}`;
		// The size is user specified we only have one size to work with.
		if (src.i) {
			sources.push(<source key={sourceKey} src={source.s} type={source.t} />);
			continue;
		}

		sources.push(<source key={sourceKey} srcSet={source.s} type={source.t} />);
	}

	let imageElement = <img {...imageOptimizationAttributes} {...rawImageProps} srcSet={src.s[0].s} alt={props.alt} />;
	if (src.i) {
		imageElement = <img {...imageOptimizationAttributes} {...rawImageProps} src={src.s[0].s} alt={props.alt} />;
	}

	return (
		<picture>
			{sources}
			{imageElement}
		</picture>
	);
}
