"use client";

import type { FolderID } from "cstd-ts/driveCMS/drive.js";
import type { GoogleDriveFileURL } from "cstd-ts/driveCMS/drive-client-side.js";
import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";

export type UploadFile = (file: File, uploadFolderID: FolderID) => ErrorReturnPromise<GoogleDriveFileURL>;

export function uploadFileFunctionFactory(apiURL: string): UploadFile {
	return async function uploadFile(file: File, uploadFolderID: FolderID): ErrorReturnPromise<GoogleDriveFileURL> {
		console.log("uploadFile");

		const formData = new FormData();
		formData.append("folderID", uploadFolderID);
		formData.append("file", file); // File z <input type="file" />

		const [response, uploadError] = await safePromise(() => fetch(apiURL, { body: formData, method: "POST" }));
		if (uploadError) {
			return [null, uploadError];
		}

		console.log(response);

		throw new Error("NOT IMPLEMENTED");
	};
}
