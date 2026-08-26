import { type ErrorReturnPromise, safePromise } from "@/error/index.js";

import { edgeGoogleAuthToken } from "../internal/edge-google-auth.js";
import type { GoogleDriveAuthorizedUploadURL, SimpleUploadFileMetadata } from "./index.js";

const CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY = process.env["CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY"];

// ADAPTED FROM: https://github.com/aynh/cloudflare-gdrive/blob/main/src/gdrive.ts
export async function internalEdgeSimpleFileUploadGetAuthorizedUploadURL(
	uploadFileMetadata: SimpleUploadFileMetadata,
): ErrorReturnPromise<GoogleDriveAuthorizedUploadURL> {
	if (typeof CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY !== "string") {
		return [
			null,
			new Error(
				"Unable to initialize, missing the 'CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY' environment variable. See https://medium.com/@matheodaly.md/using-google-drive-api-with-python-and-a-service-account-d6ae1f6456c2",
			),
		];
	}

	const [authToken, authTokenError] = await edgeGoogleAuthToken(CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY, ["https://www.googleapis.com/auth/drive"]);
	if (authTokenError) {
		return [null, authTokenError];
	}

	const requestAuthorizationHeader = `Bearer ${authToken}`;

	const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
	// url.searchParams.append("fields", "id, name, mimeType, size, imageMediaMetadata");
	url.searchParams.append("fields", "id");
	url.searchParams.append("uploadType", "resumable");
	url.searchParams.append("supportsAllDrives", "true");

	const [authorizedUploadURLResponse, errorAuthorizedUploadURL] = await safePromise(() =>
		fetch(url, {
			body: JSON.stringify(uploadFileMetadata),
			headers: {
				// biome-ignore lint/style/useNamingConvention: This is the canonical name for this header
				Authorization: requestAuthorizationHeader,
				"Content-Type": "application/json; charset=UTF-8",
			},
			method: "POST",
		}),
	);
	if (errorAuthorizedUploadURL) {
		return [null, errorAuthorizedUploadURL];
	}

	if (!authorizedUploadURLResponse.ok) {
		return [null, new Error(`Getting upload url failed ${await authorizedUploadURLResponse.text()}`)];
	}

	const location = authorizedUploadURLResponse.headers.get("location");
	if (!location) {
		return [null, new Error(`authorizedUploadURLResponse.headers.get("location") is null`)];
	}

	const authorizedUploadURL = location as GoogleDriveAuthorizedUploadURL;
	return [authorizedUploadURL, null];
}
