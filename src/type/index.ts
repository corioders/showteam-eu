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

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
export type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;

export type MapKey<T extends Map<unknown, unknown>> = T extends Map<infer K, unknown> ? K : never;
export type MapValue<T extends Map<unknown, unknown>> = T extends Map<unknown, infer V> ? V : never;
export type RemoveReadonly<T> = { -readonly [P in keyof T]: T[P] };
