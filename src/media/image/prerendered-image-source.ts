// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import { type ErrorReturn, safe } from "cstd-ts/error/index.js";

export const LOCAL_STATIC_IMAGE_PROTOCOL = "cstd-local:";

const DATA_IMAGE_TYPE_REGEX = /^image\/(?<type>[\w+.-]+)/;

export function getPrerenderedImageFilename(src: string): ErrorReturn<string> {
	const [sourceURL, sourceURLError] = safe(() => new URL(src));
	if (sourceURLError !== null) {
		return [null, new Error(`Invalid StaticImage source URL: ${src}`, { cause: sourceURLError })];
	}

	if (sourceURL.protocol === "data:") {
		const imageType = sourceURL.pathname.match(DATA_IMAGE_TYPE_REGEX)?.groups?.type;
		if (!imageType) {
			return [null, new Error("StaticImage data URL requires an image media type.")];
		}
		return [`image.${normalizeImageExtension(imageType)}`, null];
	}

	const encodedFilename = sourceURL.pathname.split("/").at(-1);
	if (!encodedFilename) {
		return sourceURL.protocol === LOCAL_STATIC_IMAGE_PROTOCOL ? [null, new Error("Local StaticImage source has no filename.")] : ["image", null];
	}

	const [filename, decodeError] = safe(() => decodeURIComponent(encodedFilename));
	if (decodeError !== null) {
		return [null, new Error(`Invalid URL-encoded StaticImage filename: ${encodedFilename}`, { cause: decodeError })];
	}
	return filename.trim() ? [filename, null] : ["image", null];
}

function normalizeImageExtension(imageType: string): string {
	switch (imageType.toLowerCase()) {
		case "jpeg":
			return "jpg";
		case "svg+xml":
			return "svg";
		case "tiff":
			return "tif";
		default:
			return imageType.toLowerCase();
	}
}
