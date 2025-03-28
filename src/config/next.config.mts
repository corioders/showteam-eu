// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { NextConfig } from 'next';
import { nextImageLoaderRegex } from 'next/dist/build/webpack-config.js';
import { regexLikeCss } from 'next/dist/build/webpack/config/blocks/css/index.js';
import { WEBPACK_RESOURCE_QUERIES } from 'next/dist/lib/constants.js';
import type { Configuration } from 'webpack';

const nextConfig: NextConfig = {
	images: {
		disableStaticImages: true,
	},

	webpack(config: Configuration, { dev: isDev, isServer }) {
		// Fix devtool source mapping
		if (isDev && config.output) {
			config.output.devtoolModuleFilenameTemplate = (info: { resourcePath: string }) => info.resourcePath.replace(/\\/g, '/');
		}

		if (!config.name) {
			throw new Error('config.name is empty');
		}

		const isEdgeServer = config.name === 'edge-server';

		if (!config?.module?.rules) {
			throw new Error('config?.module?.rules not defined');
		}

		config.module.rules.push({
			test: nextImageLoaderRegex,
			loader: 'cstd-next/media/image/webpack-loader/localStaticImageLoader.mjs',
			issuer: { not: regexLikeCss },
			dependency: { not: ['url'] },
			resourceQuery: {
				not: [new RegExp(WEBPACK_RESOURCE_QUERIES.metadata), new RegExp(WEBPACK_RESOURCE_QUERIES.metadataRoute), new RegExp(WEBPACK_RESOURCE_QUERIES.metadataImageMeta)],
			},
			options: {
				isDev: isDev,
				isServer: isServer,
				isEdgeServer: isEdgeServer,

				// Make our loader env dependent.
				__env: JSON.stringify( process.env),
			},
		});

		if (!config.resolve?.plugins) {
			throw new Error('config.resolve?.plugins not defined');
		}

		config.resolve.plugins.push({
			apply: (resolver) => {
				resolver.hooks.resolve.tap({ name: 'jsToJsxResolver', stage: 100 }, (resolveRequest) => {
					const originalRequest = resolveRequest.request;
					if (!originalRequest) {
						return undefined as unknown as null;
					}

					if (originalRequest.startsWith('cstd-next') || originalRequest.startsWith('cstd-ts')) {
						if (originalRequest.endsWith('.js')) {
							const originalRequestWithoutExtension = originalRequest.slice(0, originalRequest.length - 3);
							const resolvedWithJsxExtension = import.meta.resolve(`${originalRequestWithoutExtension}.jsx`).replace('file://', '');
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

export default nextConfig;
