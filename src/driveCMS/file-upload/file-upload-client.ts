"use client";

import type { FolderID } from "cstd-ts/driveCMS/drive.js";
import { fileIDToGoogleDriveLink, type GoogleDriveFileURL } from "cstd-ts/driveCMS/drive-client-side.js";
import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";

import { appendToFormData, type FileUploadRequestFormData, type FileUploadResponse } from "./index.js";

export type UploadFile = (file: File, uploadFolderID: FolderID) => ErrorReturnPromise<GoogleDriveFileURL>;

export function uploadFileFunctionFactory(apiURL: string): UploadFile {
	return async function uploadFile(file: File, uploadFolderID: FolderID): ErrorReturnPromise<GoogleDriveFileURL> {
		const fileUploadRequestFormData = new FormData() as FileUploadRequestFormData;
		appendToFormData(fileUploadRequestFormData, "f", file);
		appendToFormData(fileUploadRequestFormData, "p", uploadFolderID);

		const [fileUploadResponse, uploadError] = await safePromise(() =>
			fetch(apiURL, {
				body: fileUploadRequestFormData,
				method: "POST",
			}),
		);
		if (uploadError) {
			return [null, uploadError];
		}

		if (!fileUploadResponse.ok) {
			return [null, new Error(`Error while uploading file: ${fileUploadResponse.status}: ${fileUploadResponse.statusText}`)];
		}

		const [uploadedFileID, errorUpload] = await safePromise(() => fileUploadResponse.text() as Promise<FileUploadResponse>);
		if (errorUpload) {
			return [null, errorUpload];
		}

		return [fileIDToGoogleDriveLink(uploadedFileID), null];
	};
}
