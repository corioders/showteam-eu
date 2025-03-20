import type { NextConfig } from 'next';
import { nextImageLoaderRegex } from 'next/dist/build/webpack-config.js';
import { regexLikeCss } from 'next/dist/build/webpack/config/blocks/css/index.js';
import { WEBPACK_RESOURCE_QUERIES } from 'next/dist/lib/constants.js';
import type { Configuration } from 'webpack';

const nextConfig: NextConfig = {
	images: {
		disableStaticImages: true,
	},

	webpack(config: Configuration, { dev, isServer }) {
		if (dev && config.output) {
			config.output.devtoolModuleFilenameTemplate = (info: { resourcePath: string }) => info.resourcePath.replace(/\\/g, '/');
		}

		config?.module?.rules?.push({
			test: nextImageLoaderRegex,
			loader: 'cstd-next/media/image/webpack-loader/localStaticImageLoader.mjs',
			issuer: { not: regexLikeCss },
			dependency: { not: ['url'] },
			resourceQuery: {
				not: [new RegExp(WEBPACK_RESOURCE_QUERIES.metadata), new RegExp(WEBPACK_RESOURCE_QUERIES.metadataRoute), new RegExp(WEBPACK_RESOURCE_QUERIES.metadataImageMeta)],
			},
			options: {
				isDev: dev,
				isServer: isServer,
			},
		});

		config.resolve?.plugins?.push({
			apply: (resolver) => {
				resolver.hooks.resolve.tap({ name: 'jsToJsxResolver', stage: 100 }, (resolveRequest) => {
					const originalRequest = resolveRequest.request;
					if (!originalRequest) {
						return undefined as unknown as null;
					}

					if (originalRequest?.startsWith('cstd-next') || originalRequest?.startsWith('cstd-ts')) {
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
