// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import type { ImageURL } from "@/media/image/index.js";

import type { FileID } from "./drive.js";
import type { Resource } from "./resource.js";

export type ImageID = FileID & { readonly __imageTag: unique symbol };

export interface ImageResource extends Resource {
	id: ImageID;
}

export function isImage(resource: Resource): resource is ImageResource {
	return resource.mimeType.includes("image");
}
/**
 * @deprecated please use getImageDownloadURL
 */
export function getPublicImageDownloadURL(imageID: ImageID): ImageURL {
	return `https://drive.usercontent.google.com/uc?id=${imageID}&export=download` as ImageURL;
}

export function getImageDownloadURL(imageID: ImageID): ImageURL {
	return `https://www.googleapis.com/drive/v3/files/${imageID}?alt=media&supportsAllDrives=true` as ImageURL;
}
