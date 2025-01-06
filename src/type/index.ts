// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

export type ValueOf<T> = T[keyof T];

export function isBlob(x: unknown): x is Blob {
	if (typeof Blob === 'undefined') {
		return false;
	}

	return x instanceof Blob || Object.prototype.toString.call(x) === '[object Blob]';
}
