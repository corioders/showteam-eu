// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import "./../../../src/media/image/picture-display-style.css";

import type { ErrorReturn } from "cstd-ts/error/index.js";
import type { DetailedHTMLProps, ImgHTMLAttributes, JSX } from "react";

export type OptimizedImageFormat = "avif" | "webp";

export interface OptimizedImageSource {
	srcSet: string;
	type: `image/${OptimizedImageFormat}`;
}

/** Props for the required final `<img>` inside native `<picture>` markup. */
export interface OptimizedImageElement {
	src: string;
	srcSet?: string;
}

/** Serializable output shared by static imports, remote build-time images and CMS uploads. */
export interface OptimizedImageDescriptor {
	contentHash: string;
	height: number;
	width: number;
	img: OptimizedImageElement;
	sources?: OptimizedImageSource[];
}

export interface OptimizedImageProps
	extends Omit<DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, "src" | "alt" | "sizes" | "width" | "height"> {
	src: OptimizedImageDescriptor;
	alt: string;
	loading: "eager" | "lazy";
	sizes: string;
	pictureClassName?: string;
}

export function OptimizedImage({ src: image, alt, decoding = "async", loading, sizes: requestedSizes, pictureClassName, ...imgProps }: OptimizedImageProps) {
	const [sizes, sizesError] = validateSizesProperty(requestedSizes, image.img.src);
	if (sizesError !== null) {
		// biome-ignore lint/plugin/no-throw: Invalid responsive markup must abort the React render instead of emitting a broken srcset.
		throw sizesError;
	}

	const imageAttributes = {
		decoding,
		height: image.height || undefined,
		loading,
		sizes,
		width: image.width || undefined,
	};
	const sources: JSX.Element[] = (image.sources ?? []).map((source) => <source key={source.type} sizes={sizes} srcSet={source.srcSet} type={source.type} />);

	return (
		<picture className={pictureClassName}>
			{sources}
			<img {...imgProps} {...imageAttributes} alt={alt} src={image.img.src} srcSet={image.img.srcSet} />
		</picture>
	);
}

export function validateSizesProperty(userProvidedSizes: string | undefined, imageNameToReport: string): ErrorReturn<string> {
	if (!userProvidedSizes) {
		return [null, new Error(`The sizes prop is required: ${imageNameToReport}`)];
	}

	if (userProvidedSizes === "auto") {
		return [null, new Error(`The sizes='auto' attribute does not work in Safari and Firefox, sorry... ${imageNameToReport}`)];
	}

	return [userProvidedSizes, null];
}
