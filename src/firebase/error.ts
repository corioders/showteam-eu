// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, April 2025

import type { FirebaseError } from "firebase/app";

import { type ErrorReturnPromise, safePromise } from "@/error/index.js";

export type FirebaseErrorReturnPromise<T> = ErrorReturnPromise<T, FirebaseError>;

export async function firebaseSafePromise<T>(throwableFn: () => Promise<T>): FirebaseErrorReturnPromise<T> {
	return await safePromise(throwableFn);
}
