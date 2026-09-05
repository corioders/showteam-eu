// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import { getDevelopmentPrerenderedImage } from "./prerendered-image-development.js";
import { getPrerenderedImageFromManifest } from "./prerendered-image-manifest.jsx";
import { getPrerenderedImageRequestKey, type PrerenderedImageRequest } from "./prerendered-image-request.js";
import type { PrerenderedImageResource } from "./prerendered-image-resource.js";
import { getPrerenderedImageFilename } from "./prerendered-image-source.js";

/** Browser lookup is fully synchronous; async generation exists only in the server build runtime. */
export function usePrerenderedImageResource(request: PrerenderedImageRequest): PrerenderedImageResource {
	const [_, sourceError] = getPrerenderedImageFilename(request.src);
	if (sourceError !== null) {
		// biome-ignore lint/plugin/no-throw: StaticImage has a synchronous render API, so an invalid source must fail the owning React render.
		throw sourceError;
	}

	const key = getPrerenderedImageRequestKey(request);
	const developmentResource = getDevelopmentPrerenderedImage(request, key);
	if (developmentResource !== null) {
		return developmentResource;
	}

	const image = getPrerenderedImageFromManifest(key);
	if (!image) {
		if (request.runtimeAsset !== undefined) {
			return { image: request.runtimeAsset };
		}
		// biome-ignore lint/plugin/no-throw: Missing RSC image data is an unrecoverable build/runtime contract violation for this render.
		throw new Error(`Prerendered image ${key} is missing from the current route RSC payload.`);
	}

	return { image };
}
