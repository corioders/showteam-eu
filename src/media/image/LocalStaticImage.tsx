import type { ImgHTMLAttributes, JSX } from 'react';

import { IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES } from './image.mjs';
import type { INTERNAL_LocalStaticImageImport, LocalStaticImageImport } from './webpack-loader/localStaticImageLoader.mjs';

export interface LocalStaticImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
	src: LocalStaticImageImport;
	alt: string;
}

export default function LocalStaticImage(props: LocalStaticImageProps) {
	const src = props.src as INTERNAL_LocalStaticImageImport;

	const rawImageProps = { ...props } as unknown as ImgHTMLAttributes<HTMLImageElement>;

	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.src;
	// biome-ignore lint/performance/noDelete: Delete is required here
	delete rawImageProps.alt;

	const imageOptimizationAttributes = {
		...IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES,
		sizes: '100vw',
		width: src.w,
		height: src.h,
	};

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

	return (
		<picture>
			{sources}
			<img {...imageOptimizationAttributes} {...rawImageProps} alt={props.alt} />
		</picture>
	);
}
