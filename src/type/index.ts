// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

export type ValueOf<T> = T[keyof T];

export function isBlob(x: unknown): x is Blob {
	if (typeof Blob === "undefined") {
		return false;
	}

	return x instanceof Blob || Object.prototype.toString.call(x) === "[object Blob]";
}

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
export type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;

export type MapKey<T extends Map<unknown, unknown>> = T extends Map<infer K, unknown> ? K : never;
export type MapValue<T extends Map<unknown, unknown>> = T extends Map<unknown, infer V> ? V : never;
export type RemoveReadonly<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Given a union type `U = T1 | T2 | ...`, returns an intersected type
 * `(T1 & T2 & ...)`.
 *
 * Uses distributive conditional types and inference from conditional types.
 * This works because multiple candidates for the same type variable in
 * contra-variant positions causes an intersection type to be inferred.
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-inference-in-conditional-types
 * https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
export declare type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type IsEmptyObject<T> = T extends EmptyObject ? true : false;
export type EmptyObject = Record<string, never>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type DeepPrettify<T> = { [K in keyof T]: DeepPrettify<T[K]> } & {};

type RemoveNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };
/**
 * This version of prettify removes all "never" types from the type given.
 */
export type PrettifyHardcore<T> = Prettify<RemoveNever<T>>;
