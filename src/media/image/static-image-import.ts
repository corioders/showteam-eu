// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { PrerenderedImageDevelopmentAsset } from "./prerendered-image-request.js";

export interface StaticImageImport {
	developmentAsset?: PrerenderedImageDevelopmentAsset;
	src: string;
}
