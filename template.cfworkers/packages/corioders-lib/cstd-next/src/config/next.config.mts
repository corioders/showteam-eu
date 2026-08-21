// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import { fileURLToPath } from "node:url";

import { runOnceOnNextStartup } from "cstd-ts/next/import-next-config.mjs";
import type { NextConfig } from "next";
import { regexLikeCss } from "next/dist/build/webpack/config/blocks/css/index.js";
import { nextImageLoaderRegex } from "next/dist/build/webpack-config.js";
import { WEBPACK_RESOURCE_QUERIES } from "next/dist/lib/constants.js";
import type { Configuration } from "webpack";

await runOnceOnNextStartup();

export const nextConfig: NextConfig = {
	images: {
		disableStaticImages: true,
	},

	webpack(config: Configuration, { dev: isDev, isServer }) {
		// Fix devtool source mapping
		if (isDev && config.output) {
			config.output.devtoolModuleFilenameTemplate = (info: { resourcePath: string }) => info.resourcePath.replace(/\\/g, "/");
		}

		if (!config.name) {
			throw new Error("config.name is empty");
		}

		const isEdgeServer = config.name === "edge-server";

		if (!config?.module?.rules) {
			throw new Error("config?.module?.rules not defined");
		}

		config.module.rules.push({
			dependency: { not: ["url"] },
			issuer: { not: regexLikeCss },
			loader: "cstd-next/media/image/webpack-loader/local-static-image-loader.mjs",
			options: {
				isDev: isDev,
				isEdgeServer: isEdgeServer,
				isServer: isServer,
			},
			resourceQuery: {
				not: [new RegExp(WEBPACK_RESOURCE_QUERIES.metadata), new RegExp(WEBPACK_RESOURCE_QUERIES.metadataRoute), new RegExp(WEBPACK_RESOURCE_QUERIES.metadataImageMeta)],
			},
			test: nextImageLoaderRegex,
		});

		if (!config.resolve?.plugins) {
			throw new Error("config.resolve?.plugins not defined");
		}

		config.resolve.plugins.push({
			apply: (resolver) => {
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Webpack resolver must handle these mutually exclusive request forms.
				resolver.hooks.resolve.tap({ name: "jsToJsxResolver", stage: 100 }, (resolveRequest) => {
					const originalRequest = resolveRequest.request;
					if (!originalRequest) {
						return undefined as unknown as null;
					}

					if (originalRequest.startsWith("cstd-next") || originalRequest.startsWith("cstd-ts")) {
						if (originalRequest.endsWith(".js")) {
							const originalRequestWithoutExtension = originalRequest.slice(0, originalRequest.length - 3);
							const resolvedWithJsxExtensionUrl = import.meta.resolve(`${originalRequestWithoutExtension}.jsx`);
							const resolvedWithJsxExtension = resolvedWithJsxExtensionUrl.startsWith("file://")
								? fileURLToPath(resolvedWithJsxExtensionUrl)
								: resolvedWithJsxExtensionUrl;
							if (resolvedWithJsxExtension) {
								return { ...resolveRequest, path: resolvedWithJsxExtension };
							}
						}
					}

					return undefined as unknown as null;
				});
			},
		});

		return config;
	},
};
