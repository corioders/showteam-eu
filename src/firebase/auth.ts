// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, April 2025

import type { ErrorReturnPromise } from '@/error/index.js';
import type { FirebaseApp } from 'firebase/app';
import { type UserCredential, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { firebaseSafePromise } from './error.js';

const REQUIREMENTS_REGEX = /\[(?<requirements>.*)\]/;
export async function firebaseSignupUserWithEmailAndPassword(firebaseApp: FirebaseApp, email: string, password: string): ErrorReturnPromise<UserCredential> {
	const auth = getAuth(firebaseApp);

	const [userCredentials, userError] = await firebaseSafePromise(() => createUserWithEmailAndPassword(auth, email, password));
	if (userError) {
		switch (userError.code) {
			case 'auth/email-already-in-use':
				return [null, new Error('Email already in use', { cause: userError })];
			case 'auth/invalid-email':
				return [null, new Error('Invalid email', { cause: userError })];
			case 'auth/operation-not-allowed':
				return [null, new Error('Operation not allowed', { cause: userError })];
			case 'auth/password-does-not-meet-requirements': {
				const requirements = userError.message.match(REQUIREMENTS_REGEX);
				const requirementsText = requirements?.groups?.['requirements'] ?? '';

				return [null, new Error(`Weak password: ${requirementsText}`, { cause: userError })];
			}
			default:
				return [null, new Error(`Unknown error: ${userError.message}`, { cause: userError })];
		}
	}

	return [userCredentials, null];
}
