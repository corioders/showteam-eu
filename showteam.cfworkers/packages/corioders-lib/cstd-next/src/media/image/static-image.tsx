// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import { usePrerenderedImageResource } from "#cstd-next-prerendered-image-runtime";

import { OptimizedImage, type OptimizedImageProps } from "./optimized-image.jsx";
import type { PrerenderedImageRequest } from "./prerendered-image-request.js";
import { PRERENDERED_IMAGE_MARKER_ATTRIBUTE } from "./prerendered-image-resource.js";
import type { StaticImageImport } from "./static-image-import.js";

export interface StaticImageProps extends Omit<OptimizedImageProps, "src"> {
	src: string | StaticImageImport;
}

/** Prerenders either a local static import or a remote URL into deployment-owned image assets. */
export function StaticImage({ src, ...imageProps }: StaticImageProps) {
	const source = typeof src === "string" ? { src } : src;
	const request: PrerenderedImageRequest = {
		developmentAsset: source.developmentAsset,
		sizes: imageProps.sizes,
		src: source.src,
	};
	const resource = usePrerenderedImageResource(request);
	const markerProps = resource.markerKey === undefined ? {} : { [PRERENDERED_IMAGE_MARKER_ATTRIBUTE]: resource.markerKey };

	return <OptimizedImage {...imageProps} {...markerProps} src={resource.image} />;
}
