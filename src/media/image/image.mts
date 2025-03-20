export type ImageType =
	| 'avif'
	| 'dz'
	| 'fits'
	| 'gif'
	| 'heif'
	| 'input'
	| 'jpeg'
	| 'jpg'
	| 'jp2'
	| 'jxl'
	| 'png'
	| 'ppm'
	| 'raw'
	| 'svg'
	| 'tiff'
	| 'tif'
	| 'v'
	| 'webp';

// Don not ask me why I need to create this type... Stupid typescript.
export const IMAGE_DEFAULT_OPTIMIZATION_ATTRIBUTES: { loading: 'lazy'; decoding: 'async' } = {
	loading: 'lazy',
	decoding: 'async',
};

export const IMAGE_FORMATS: ImageType[] = ['avif', 'webp'];
export const IMAGE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048];
