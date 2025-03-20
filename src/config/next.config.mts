import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

import { nextImageLoaderRegex } from 'next/dist/build/webpack-config.js';
import { regexLikeCss } from 'next/dist/build/webpack/config/blocks/css/index.js';
import { WEBPACK_RESOURCE_QUERIES } from 'next/dist/lib/constants.js';

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

		return config;
	},
};

export default nextConfig;
