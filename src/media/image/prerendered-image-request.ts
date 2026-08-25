// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

/** Stable key input for build-time image generation and Promise deduplication. */
export interface PrerenderedImageDevelopmentAsset {
	height: number;
	src: string;
	width: number;
}

export interface PrerenderedImageRequest {
	/** Loader-generated browser asset used instead of build-time optimization in next dev. */
	developmentAsset?: PrerenderedImageDevelopmentAsset;
	sizes: string;
	src: string;
}

export function getPrerenderedImageMode(): "development" | "production" {
	return process.env.NODE_ENV === "development" ? "development" : "production";
}

export function serializePrerenderedImageRequest(request: PrerenderedImageRequest): string {
	return JSON.stringify({
		sizes: request.sizes,
		src: request.src,
	});
}

/**
 * Fast deterministic 128-bit request key shared by Node and browsers.
 * This is an internal lookup key, not a security or content-integrity hash.
 */
export function getPrerenderedImageRequestKey(request: PrerenderedImageRequest): string {
	const value = serializePrerenderedImageRequest(request);
	let first = 1_779_033_703;
	let second = 3_144_134_277;
	let third = 1_013_904_242;
	let fourth = 2_773_480_762;

	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		first = second ^ Math.imul(first ^ code, 597_399_067);
		second = third ^ Math.imul(second ^ code, 2_869_860_233);
		third = fourth ^ Math.imul(third ^ code, 951_274_213);
		fourth = first ^ Math.imul(fourth ^ code, 2_716_044_179);
	}

	first = Math.imul(third ^ (first >>> 18), 597_399_067);
	second = Math.imul(fourth ^ (second >>> 22), 2_869_860_233);
	third = Math.imul(first ^ (third >>> 17), 951_274_213);
	fourth = Math.imul(second ^ (fourth >>> 19), 2_716_044_179);

	return [first, second, third, fourth].map((part) => (part >>> 0).toString(16).padStart(8, "0")).join("");
}
