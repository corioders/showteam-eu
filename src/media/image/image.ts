import type SharpType from 'sharp';

export type ImageType = 'bmp' | 'cur' | 'dds' | 'gif' | 'ico' | 'jpg' | 'png' | 'psd' | 'svg' | 'webp';
export type FormatType = keyof SharpType.FormatEnum;

export interface ImageInfo {
	width: number;
	height: number;
	type: ImageType;
}

// Don not ask me why I need to create this type... Stupid typescript.
export const IMAGE_OPTIMIZATION_ATTRIBUTES: { loading: 'lazy'; decoding: 'async' } = {
	loading: 'lazy',
	decoding: 'async',
};
