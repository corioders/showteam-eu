import type { StaticImageData, StaticImport, StaticRequire } from 'next/dist/shared/lib/get-img-props';

export type ImageSource = string | StaticImport;

export function normalizeImageSource(imageSource: ImageSource): StaticImageData | string {
	if (typeof imageSource === 'string') {
		return imageSource;
	}

	if (isStaticRequire(imageSource)) {
		return imageSource.default;
	}

	return imageSource;
}

export function isStaticRequire(x: string | StaticImport): x is StaticRequire {
	if (typeof x === 'string') {
		return false;
	}

	if ('default' in x && typeof x.default === 'object') {
		return true;
	}

	return false;
}
