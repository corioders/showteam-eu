// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024
import { ErrorReturnPromise } from '@/error';
import sizeOf from 'buffer-image-size';

export interface ImageSize {
	width: number;
	height: number;
}

export async function imageSize(src: string): ErrorReturnPromise<ImageSize> {
	return [{height:100, width:100}, null]

	try {
		const response = await fetch(src);
		const responseArrayBuffer = await response.arrayBuffer();
		const responseBuffer = Buffer.from(responseArrayBuffer);
		const size = sizeOf(responseBuffer);
		const imageSize = {
			width: size.width,
			height: size.height,
		};

		return [imageSize, null];
	} catch (err) {
		// TODO: Better wrapper.
		const errString = String(err);
		return [null, new Error(errString)];
	}
}
