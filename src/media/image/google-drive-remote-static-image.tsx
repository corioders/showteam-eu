// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import "server-only";

import { getRequestAuthHeaders } from "cstd-ts/driveCMS/index.js";
import { use } from "react";

import { OptimizedImage } from "./optimized-image.jsx";
import { loadPrerenderedImage } from "./prerendered-image-runtime.js";
import type { StaticImageProps } from "./static-image.jsx";

export interface GoogleDriveRemoteStaticImageProps extends Omit<StaticImageProps, "src"> {
	src: string;
}

export const GoogleDriveRemoteStaticImage = function GoogleDriveRemoteStaticImage({ src, ...imageProps }: GoogleDriveRemoteStaticImageProps) {
	const optimizedImage = use(loadGoogleDriveRemoteStaticImage(src, imageProps.sizes));
	return <OptimizedImage {...imageProps} src={optimizedImage} />;
};

async function loadGoogleDriveRemoteStaticImage(src: string, sizes: string) {
	"use cache";
	const [fetchDriveCMSHeaders, headersError] = await getRequestAuthHeaders(src);
	return loadPrerenderedImage({
		fetchRequestInit: headersError ? undefined : { headers: fetchDriveCMSHeaders },
		sizes,
		src,
	});
}
