/** biome-ignore-all assist/source/useSortedKeys: This code is adapted from https://github.com/googleapis/node-gtoken/blob/main/esm/src/index.ts */
/** biome-ignore-all lint/complexity/useDateNow: Same as above */
/** biome-ignore-all lint/style/useNamingConvention: Same as above */

import { type ErrorReturnPromise, safePromise, unreachableErrorMessage } from "@/error/index.js";

import { sign } from "./edge-jws.js";

export type GoogleAccessToken = string & { readonly googleAccessToken: unique symbol };

export function edgeGoogleAuthToken(googleAuthJSON: string, scopes: string[]): ErrorReturnPromise<GoogleAccessToken> {
	const parsedGoogleAuthJSON = JSON.parse(googleAuthJSON);

	const key = parsedGoogleAuthJSON["private_key"];
	const iss = parsedGoogleAuthJSON["client_email"];
	const scope = scopes.join(" ");

	return requestToken(iss, scope, key);
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function requestToken(iss: string, scope: string, key: string): ErrorReturnPromise<GoogleAccessToken> {
	const iat = Math.floor(new Date().getTime() / 1000);
	const payload = {
		aud: GOOGLE_TOKEN_URL,
		exp: iat + 3600,
		iat,
		iss: iss,
		scope: scope,
	};

	const signedJWT = await sign({
		header: { alg: "RS256" },
		payload,
		secret: key,
	});

	const body = new URLSearchParams({
		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		assertion: signedJWT,
	});

	const [response, errorAuth] = await safePromise(() =>
		fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			body: body,
		}),
	);
	if (errorAuth) {
		return [null, errorAuth];
	}

	interface GoogleAuthResponse {
		access_token: GoogleAccessToken;
		expires_in: number;
		token_type: string;
	}

	interface GoogleAuthErrorResponse {
		error: string;
		error_description: string;
	}

	const [responseJson, errorJson] = await safePromise<GoogleAuthResponse | GoogleAuthErrorResponse>(() => response.json());
	if (errorJson) {
		return [null, errorJson];
	}

	if ("error" in responseJson) {
		return [null, new Error(`Unable to google auth on edge ${responseJson}`)];
	}

	const accessToken = responseJson.access_token;
	if (!accessToken) {
		return [null, new Error(unreachableErrorMessage("Access token not found"))];
	}

	return [accessToken, null];
}
