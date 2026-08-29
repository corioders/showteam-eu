// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { runOnceOnNextStartup } from "cstd-ts/next/import-next-config.js";
import type { NextConfig } from "next";

import "../media/image/turbopack-loader/image-types.js";

await runOnceOnNextStartup();

const TURBOPACK_IMAGE_EXTENSIONS = ["avif", "gif", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp"];
const imageRules = Object.fromEntries(
	TURBOPACK_IMAGE_EXTENSIONS.flatMap((extension) =>
		[extension, extension.toUpperCase()].map((variant) => [
			`*.${variant}`,
			{
				as: "*.js" as const,
				condition: { not: "foreign" as const },
				loaders: ["cstd-next/media/image/turbopack-loader/static-image-import-loader.js"],
			},
		]),
	),
);
const pageManifestRule = {
	"*": {
		as: "*.js" as const,
		condition: {
			all: [{ not: "foreign" as const }, { path: /(^|\/)page\.[cm]?[jt]sx?$/ }, { query: /^$/ }],
		},
		loaders: ["cstd-next/media/image/turbopack-loader/page-manifest-loader.js"],
	},
};
export const nextConfig: NextConfig = {
	cacheComponents: true,
	images: {
		disableStaticImages: true,
	},
	turbopack: {
		resolveAlias: {
			"#cstd-next-prerendered-image-runtime": {
				browser: "cstd-next/media/image/prerendered-image-runtime-browser.js",
			},
		},
		rules: {
			...imageRules,
			...pageManifestRule,
		},
	},
};
