// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { OptimizedImageDescriptor } from "./optimized-image.jsx";

export const PRERENDERED_IMAGE_DESCRIPTOR_DIRECTORY = ".next/cache/corioders/cstd-next-prerendered-image/descriptor";
export const PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER = "__CSTD_NEXT_PRERENDERED_IMAGE_MANIFEST__";
export const PRERENDERED_IMAGE_MARKER_ATTRIBUTE = "data-cstd-prerendered-image";

export interface PrerenderedImageResource {
	image: OptimizedImageDescriptor;
	markerKey?: string;
}
