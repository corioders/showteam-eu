import type { BinaryLike, createHash as createHashType } from 'node:crypto';
import readImageInfoFromBufferInternal from 'buffer-image-size';
import { IMAGE_FORMATS, IMAGE_SIZES, type ImageType } from './image.mjs';

export function hash(data: BinaryLike, createHash: typeof createHashType): string {
	return createHash('shake256', { outputLength: 32 }).update(data).digest('hex');
}

export interface ImageInfo {
	width: number;
	height: number;
	type: ImageType;
}

export function readImageInfoFromBuffer(imageBuffer: Buffer): ImageInfo {
	return readImageInfoFromBufferInternal(imageBuffer) as ImageInfo;
}

export interface PictureSource {
	// If userSpecifiedWidth is set, only this width is generated
	srcSetORsrc: string;
	type: `image/${ImageType}`;
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface INTERNAL_PictureSource extends PictureSource {
	__sharpEntries: INTERNAL_SharpEntry[];
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface INTERNAL_SharpEntry {
	targetFormat: ImageType;
	targetWidth: number;
	filepath: string;
}

const NEXTJS_IMAGE_FOLDER = '.next/static/media';
const NEXTJS_URL_PREFIX = '/_next/static/media';

function getImageFilenameMeta(imageFilename: string, imageSpecificHash: string) {
	return (width: number, format: ImageType) => `${imageFilename}.${imageSpecificHash}.${width.toString()}.${format}`;
}
function getImageUrlMeta(imageFilename: string, imageSpecificHash: string, baseURL: string) {
	return (width: number, format: ImageType) => encodeURI(`${baseURL}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`);
}
function getImageFilepathMeta(imageFilename: string, imageSpecificHash: string, baseFilePath: string) {
	return (width: number, format: ImageType) => `${baseFilePath}/${getImageFilenameMeta(imageFilename, imageSpecificHash)(width, format)}`;
}
export function getImageSourcesNotSvg(
	imageFilename: string,
	imageSpecificHash: string,
	imageInfo: ImageInfo,
	userSpecifiedWidth?: number,
	baseFilePath: string = NEXTJS_IMAGE_FOLDER,
	baseURL: string = NEXTJS_URL_PREFIX,
): INTERNAL_PictureSource[] {
	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	if (imageInfo.type === 'svg') {
		throw new Error('Svg image cannot be treated as a regular image');
	}

	if (userSpecifiedWidth) {
		if (userSpecifiedWidth > imageInfo.width) {
			throw new Error(`User specified width of ${userSpecifiedWidth}. This requires upscaling of the image. The original image has width of ${imageInfo.width}.`);
		}

		const sources: INTERNAL_PictureSource[] = [];
		for (const targetFormat of IMAGE_FORMATS) {
			sources.push({
				srcSetORsrc: getImageUrl(userSpecifiedWidth, targetFormat),
				type: `image/${targetFormat}`,

				__sharpEntries: [{ targetFormat: targetFormat, targetWidth: userSpecifiedWidth, filepath: getImageFilepath(userSpecifiedWidth, targetFormat) }],
			});
		}

		return sources;
	}

	const sources: INTERNAL_PictureSource[] = [];
	const targetWidths = [...IMAGE_SIZES, imageInfo.width].sort((a, b) => a - b);
	for (const targetFormat of IMAGE_FORMATS) {
		let srcSetPerFormat = '';

		const sharpEntries: INTERNAL_SharpEntry[] = [];
		for (const targetWidth of targetWidths) {
			// Prevent upscaling.
			if (targetWidth > imageInfo.width) {
				continue;
			}

			srcSetPerFormat += `${getImageUrl(targetWidth, targetFormat)} ${targetWidth}w, `;
			sharpEntries.push({ targetFormat: targetFormat, targetWidth: targetWidth, filepath: getImageFilepath(targetWidth, targetFormat) });
		}

		// Remove the last ", "
		srcSetPerFormat = srcSetPerFormat.slice(0, srcSetPerFormat.length - 2);
		sources.push({
			srcSetORsrc: srcSetPerFormat,
			type: `image/${targetFormat}`,
			__sharpEntries: sharpEntries,
		});
	}

	return sources;
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface INTERNAL__SVGEntry {
	src: string;
	filepath: string;
}

export function getSvgEntry(
	imageFilename: string,
	imageSpecificHash: string,
	imageInfo: ImageInfo,
	baseFilePath: string = NEXTJS_IMAGE_FOLDER,
	baseURL: string = NEXTJS_URL_PREFIX,
): INTERNAL__SVGEntry {
	const getImageUrl = getImageUrlMeta(imageFilename, imageSpecificHash, baseURL);
	const getImageFilepath = getImageFilepathMeta(imageFilename, imageSpecificHash, baseFilePath);

	return {
		src: getImageUrl(imageInfo.width, 'svg'),
		filepath: getImageFilepath(imageInfo.width, 'svg'),
	};
}
