// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { PrerenderedImageRequest } from "./prerendered-image-request.js";
import type { PrerenderedImageResource } from "./prerendered-image-resource.js";
import { LOCAL_STATIC_IMAGE_PROTOCOL } from "./prerendered-image-source.js";

export function getDevelopmentPrerenderedImage(request: PrerenderedImageRequest, key: string): PrerenderedImageResource | null {
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	const developmentAsset = request.developmentAsset;
	if (request.src.startsWith(LOCAL_STATIC_IMAGE_PROTOCOL) && developmentAsset === undefined) {
		// biome-ignore lint/plugin/no-throw: A missing loader asset is an internal next dev invariant and the render cannot continue with cstd-local://.
		throw new Error(`Local StaticImage source ${request.src} has no development browser asset.`);
	}

	return {
		image: {
			contentHash: key,
			height: developmentAsset?.height ?? 0,
			img: { src: developmentAsset?.src ?? request.src },
			width: developmentAsset?.width ?? 0,
		},
	};
}
