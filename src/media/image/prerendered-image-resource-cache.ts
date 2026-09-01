// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

"use cache";

import type { PrerenderedImageRequest } from "./prerendered-image-request.js";
import type { PrerenderedImageResource } from "./prerendered-image-resource.js";
import { loadPrerenderedImageResource } from "./prerendered-image-runtime.js";

export async function loadCachedPrerenderedImageResource(request: PrerenderedImageRequest): Promise<PrerenderedImageResource> {
	return loadPrerenderedImageResource(request);
}
