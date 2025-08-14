// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import { type ErrorReturnPromise, safePromise } from "@/error/index.js";

import type { FileID, FolderID } from "./drive.js";
import type { Form } from "./form.js";

function getCoriodersFormUploadWorkerUploadPath(coriodersFormUploadWorkerURL: string, targetFolderID: FolderID) {
	return `${coriodersFormUploadWorkerURL}/upload/${targetFolderID}`;
}

export async function uploadFileUsingForm(form: Form, file: File, shortQuestionTitle: string): ErrorReturnPromise<FileID> {
	const fileUploadOptions = form.fileUpload;
	if (!fileUploadOptions) {
		return [null, new Error("File upload options were not provided while this form requires form upload. Call up your Digital team.")];
	}

	const targetFolderID = fileUploadOptions.fileUploadQuestionsFolders[shortQuestionTitle];
	if (!targetFolderID) {
		return [null, new Error(`Unable to find folder for file upload question: ${shortQuestionTitle}`)];
	}

	const uploadURL = getCoriodersFormUploadWorkerUploadPath(fileUploadOptions.coriodersFormUploadWorkerURL, targetFolderID);

	const formUploadWorkerForm = new FormData();
	formUploadWorkerForm.append("file", file);

	const [formUploadWorkerResponse, formUploadWorkerResponseError] = await safePromise(() =>
		fetch(uploadURL, {
			body: formUploadWorkerForm,
			method: "POST",
			mode: "cors",
		}),
	);
	if (formUploadWorkerResponseError) {
		return [null, formUploadWorkerResponseError];
	}
	if (!formUploadWorkerResponse.ok) {
		return [null, new Error(`Error while uploading file: ${formUploadWorkerResponse.statusText}`)];
	}

	const formUploadWorkerResponseText = await formUploadWorkerResponse.text();
	const uploadedFileID = formUploadWorkerResponseText as FileID;

	return [uploadedFileID, null];
}

const fileUploadQuestionPrefix = "FileUpload";

export function isFileUploadQuestion(title: string): boolean {
	return title.startsWith(fileUploadQuestionPrefix);
}

export function getFileUploadQuestionTitle(title: string): string {
	return title.replace(fileUploadQuestionPrefix, "").trim();
}
