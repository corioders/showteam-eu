// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import "server-only";

import { getRequestAuthHeaders } from "cstd-ts/driveCMS/index.js";

import { memoizeImages } from "./cache.js";
import { RemoteStaticImage, type RemoteStaticImageProps } from "./remote-static-image.jsx";

export const GoogleDriveRemoteStaticImage = memoizeImages(async function GoogleDriveRemoteStaticImage(props: RemoteStaticImageProps) {
	const fetchDriveCMSHeaders = await getRequestAuthHeaders(props.src);
	return <RemoteStaticImage fetchRequestInit={{ headers: fetchDriveCMSHeaders }} {...props} />;
});
