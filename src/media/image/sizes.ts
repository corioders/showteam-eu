// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import type { ErrorReturn } from "cstd-ts/error/index.js";

const SAMPLED_VIEWPORT_WIDTHS = [320, 375, 425, 640, 768, 1024, 1280, 1440, 1920, 2560, 3840];
const DEVICE_PIXEL_RATIOS = [1, 2];
const SOURCE_SIZE_REGEX = /^(?:(?<media>.+)\s+)?(?<value>\d+(?:\.\d+)?)(?<unit>px|vw)$/;
const MEDIA_WIDTH_REGEX = /\(\s*(?<bound>min|max)-width\s*:\s*(?<value>\d+(?:\.\d+)?)px\s*\)/g;
const MEDIA_AND_REGEX = /\s+and\s+/g;

interface SourceSize {
	mediaBounds: MediaWidthBound[];
	unit: "px" | "vw";
	value: number;
}

interface MediaWidthBound {
	bound: "min" | "max";
	value: number;
}

export function getTargetWidthsFromSizes(sizes: string, sourceWidth: number): ErrorReturn<number[]> {
	if (!(Number.isInteger(sourceWidth) && sourceWidth > 0)) {
		return [null, new Error(`Source image width must be a positive integer: ${sourceWidth}`)];
	}

	const [sourceSizes, parseError] = parseSourceSizes(sizes);
	if (parseError !== null) {
		return [null, parseError];
	}
	const finalSourceSize = sourceSizes.at(-1);
	if (!finalSourceSize || finalSourceSize.mediaBounds.length > 0) {
		return [null, new Error("The sizes prop requires an unconditional final source size.")];
	}

	const mediaBreakpoints = sourceSizes.flatMap((sourceSize) => sourceSize.mediaBounds.map((bound) => bound.value));
	const sampledViewportWidths = [...new Set([...SAMPLED_VIEWPORT_WIDTHS, ...mediaBreakpoints])].sort((a, b) => a - b);
	const targetWidths = new Set<number>();

	for (const viewportWidth of sampledViewportWidths) {
		const sourceSize = sourceSizes.find((candidate) => mediaMatches(candidate.mediaBounds, viewportWidth));
		if (!sourceSize) {
			return [null, new Error(`Unable to resolve sizes for a ${viewportWidth}px viewport.`)];
		}

		const slotWidth = sourceSize.unit === "vw" ? (viewportWidth * sourceSize.value) / 100 : sourceSize.value;
		for (const devicePixelRatio of DEVICE_PIXEL_RATIOS) {
			targetWidths.add(Math.min(sourceWidth, Math.max(1, Math.ceil(slotWidth * devicePixelRatio))));
		}
	}

	return [[...targetWidths].sort((a, b) => a - b), null];
}

function parseSourceSizes(sizes: string): ErrorReturn<SourceSize[]> {
	const sourceSizeItems = sizes.split(",").map((item) => item.trim());
	if (sourceSizeItems.length === 0 || sourceSizeItems.some((item) => item.length === 0)) {
		return [null, new Error(`Invalid sizes prop: ${sizes}`)];
	}

	const sourceSizes: SourceSize[] = [];
	for (const sourceSizeItem of sourceSizeItems) {
		const sourceSizeMatch = sourceSizeItem.match(SOURCE_SIZE_REGEX);
		if (!sourceSizeMatch?.groups) {
			return [null, new Error(`Unsupported sizes entry '${sourceSizeItem}'. Use px/vw lengths and min-width/max-width px conditions.`)];
		}

		const value = Number(sourceSizeMatch.groups.value);
		if (!(Number.isFinite(value) && value > 0)) {
			return [null, new Error(`The sizes entry must be greater than zero: ${sourceSizeItem}`)];
		}

		const [mediaBounds, mediaError] = parseMediaBounds(sourceSizeMatch.groups.media ?? "");
		if (mediaError !== null) {
			return [null, mediaError];
		}

		sourceSizes.push({ mediaBounds, unit: sourceSizeMatch.groups.unit as SourceSize["unit"], value });
	}

	return [sourceSizes, null];
}

function parseMediaBounds(media: string): ErrorReturn<MediaWidthBound[]> {
	if (!media) {
		return [[], null];
	}

	const mediaBounds: MediaWidthBound[] = [];
	for (const match of media.matchAll(MEDIA_WIDTH_REGEX)) {
		if (!match.groups) {
			continue;
		}
		mediaBounds.push({ bound: match.groups.bound as MediaWidthBound["bound"], value: Number(match.groups.value) });
	}

	const unsupportedMedia = media.replaceAll(MEDIA_WIDTH_REGEX, "").replaceAll(MEDIA_AND_REGEX, "").trim();
	if (mediaBounds.length === 0 || unsupportedMedia) {
		return [null, new Error(`Unsupported sizes media condition '${media}'. Use min-width/max-width conditions in px.`)];
	}

	return [mediaBounds, null];
}

function mediaMatches(mediaBounds: readonly MediaWidthBound[], viewportWidth: number): boolean {
	return mediaBounds.every((bound) => (bound.bound === "min" ? viewportWidth >= bound.value : viewportWidth <= bound.value));
}
