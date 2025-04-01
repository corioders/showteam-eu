// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024
import { type ErrorReturn, safe } from '@/error';
import sizeOf from 'buffer-image-size';

export interface ImageSize {
	width: number;
	height: number;
	type: 'bmp' | 'cur' | 'dds' | 'gif' | 'ico' | 'jpg' | 'png' | 'psd' | 'svg' | 'webp';
}

export function imageSize(responseBuffer: Buffer): ErrorReturn<ImageSize> {
	return safe(() => sizeOf(responseBuffer) as ImageSize);
}
