"use client";

// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { OptimizedImageDescriptor } from "./optimized-image.jsx";
import { PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER } from "./prerendered-image-resource.js";

type PrerenderedImageManifest = Record<string, OptimizedImageDescriptor>;

const prerenderedImages = new Map<string, OptimizedImageDescriptor>();

export function PrerenderedImageManifestSeed(props: { value: string }) {
	if (props.value !== PRERENDERED_IMAGE_MANIFEST_PLACEHOLDER) {
		const manifest = decodeManifest(props.value);
		for (const [key, image] of Object.entries(manifest)) {
			prerenderedImages.set(key, image);
		}
	}

	return null;
}

export function getPrerenderedImageFromManifest(key: string): OptimizedImageDescriptor | undefined {
	return prerenderedImages.get(key);
}

function decodeManifest(value: string): PrerenderedImageManifest {
	const bytes = Uint8Array.from(atob(value), (character) => character.codePointAt(0) ?? 0);
	return JSON.parse(new TextDecoder().decode(bytes)) as PrerenderedImageManifest;
}
