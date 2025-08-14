// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, April 2025

import type { FirebaseApp, FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, type UserCredential } from "firebase/auth";

import type { ErrorReturnPromise } from "@/error/index.js";

import { firebaseSafePromise } from "./error.js";

export async function firebaseSignupUserWithEmailAndPassword(firebaseApp: FirebaseApp, email: string, password: string): ErrorReturnPromise<UserCredential> {
	const auth = getAuth(firebaseApp);

	const [createUserCredentials, createUserError] = await firebaseSafePromise(() => createUserWithEmailAndPassword(auth, email, password));
	if (createUserError) {
		return [null, switchFirebaseLoginError(createUserError)];
	}

	return [createUserCredentials, null];
}

export async function firebaseSigninUserWithEmailAndPassword(firebaseApp: FirebaseApp, email: string, password: string): ErrorReturnPromise<UserCredential> {
	const auth = getAuth(firebaseApp);

	const [loginUserCredentials, loginUserError] = await firebaseSafePromise(() => signInWithEmailAndPassword(auth, email, password));
	if (loginUserError) {
		return [null, switchFirebaseLoginError(loginUserError)];
	}

	return [loginUserCredentials, null];
}

export async function firebaseLogout(firebaseApp: FirebaseApp): Promise<Error | null> {
	const auth = getAuth(firebaseApp);
	const [_, logoutUserError] = await firebaseSafePromise(() => auth.signOut());
	if (logoutUserError) {
		return switchFirebaseLoginError(logoutUserError);
	}

	return null;
}

const REQUIREMENTS_REGEX = /\[(?<requirements>.*)\]/;
function switchFirebaseLoginError(error: FirebaseError): Error {
	switch (error.code) {
		case "auth/email-already-in-use":
			return new Error("Email already in use", { cause: error });
		case "auth/invalid-email":
			return new Error("Invalid email", { cause: error });
		case "auth/operation-not-allowed":
			return new Error("Operation not allowed", { cause: error });
		case "auth/invalid-credential":
			return new Error("Invalid credential", { cause: error });
		case "auth/password-does-not-meet-requirements": {
			const requirements = error.message.match(REQUIREMENTS_REGEX);
			const requirementsText = requirements?.groups?.["requirements"] ?? "";
			return new Error(`Weak password: ${requirementsText}`, { cause: error });
		}
		default:
			return new Error(`Unknown error: ${error.message}`, { cause: error });
	}
}

type IsLoggedInSyncPromise = Promise<boolean>;
const isLoggedInSyncPromisePerFirebaseApp: Map<FirebaseApp, IsLoggedInSyncPromise> = new Map();

function initIsLoggedInSyncPromise(firebaseApp: FirebaseApp) {
	if (isLoggedInSyncPromisePerFirebaseApp.get(firebaseApp)) {
		return;
	}

	const isLoggedInSyncPromise = new Promise<boolean>((resolve, reject) => {
		const auth = getAuth(firebaseApp);
		const unsubscribe = onAuthStateChanged(
			auth,
			(user) => {
				unsubscribe();
				if (user === null) {
					resolve(false);
					return;
				}
				resolve(true);
			},
			reject,
		);
	});

	isLoggedInSyncPromisePerFirebaseApp.set(firebaseApp, isLoggedInSyncPromise);

	return;
}

export async function isLoggedIn(firebaseApp: FirebaseApp): Promise<boolean> {
	initIsLoggedInSyncPromise(firebaseApp);
	await isLoggedInSyncPromisePerFirebaseApp.get(firebaseApp);
	const auth = getAuth(firebaseApp);
	if (auth.currentUser !== null) {
		return true;
	}

	return false;
}
