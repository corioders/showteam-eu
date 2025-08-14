// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

/** biome-ignore-all lint/style/noDefaultExport: default export is required for image declaration purposes */
interface LocalStaticImageImport {
	// Hash of the original image. Can be used inside the react key prop.
	contentHash: string;
	// Filename of the original image without extension.
	filename: string;
}

// declare module '*.svg' {
// 	/**
// 	 * Use `any` to avoid conflicts with
// 	 * `@svgr/webpack` plugin or
// 	 * `babel-plugin-inline-react-svg` plugin.
// 	 */
// 	const content: any;

// 	export default content;
// }

declare module "*.scaled" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*avif" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*dz" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*fits" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*gif" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*heif" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*input" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*jpeg" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*jpg" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*jp2" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*jxl" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*png" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*ppm" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*raw" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*svg" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*tiff" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*tif" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*v" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*webp" {
	const content: LocalStaticImageImport;
	export default content;
}

declare module "*AVIF" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*DZ" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*FITS" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*GIF" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*HEIF" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*INPUT" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*JPEG" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*JPG" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*JP2" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*JXL" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*PNG" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*PPM" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*RAW" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*SVG" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*TIFF" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*TIF" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*V" {
	const content: LocalStaticImageImport;
	export default content;
}
declare module "*WEBP" {
	const content: LocalStaticImageImport;
	export default content;
}
