// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import { type ErrorReturnPromise, safePromise } from '@/error/index.js';
import { type forms_v1, google } from 'googleapis';
import type { GoogleAuth } from 'googleapis-common';
import { StatusCodes } from 'http-status-codes';
import { memoizeDriveCMS } from './cache.js';
import { type FileID, type FolderID, createFolder, internalListFolderNoCache, isFolder } from './drive.js';
import { getFileUploadQuestionTitle, isFileUploadQuestion } from './formClientSide.js';
import type { Resource } from './resource.js';

export type FormID = FileID & { readonly __formTag: unique symbol };
export interface FormResource extends Resource {
	id: FormID;
	mimeType: 'application/vnd.google-apps.form';
}

export function isForm(resource: Resource): resource is FormResource {
	return resource.mimeType === 'application/vnd.google-apps.form';
}

export interface Form {
	googleAPIsForm: forms_v1.Schema$Form;
	formResponsePostURL: string;
	fileUpload?: {
		fileUploadQuestionsFolders: Record<string, FolderID>;
		coriodersFormUploadWorkerURL: string;
	};
}

// WARNING: The upload worker MUST use a different google account with write ONLY permissions, ONLY to the correct folders.
// WARNING: THE USER HAS CONTROL OVER THE FOLDER ID, SO MAKE SURE TO SET UP THE PERMISSIONS ACCORDINGLY
export interface FileUploadOptions {
	targetGoogleDriveFolderID: FolderID;
	coriodersFormUploadWorkerURL: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
export const getForm = memoizeDriveCMS(async function getForm(
	googleAuth: GoogleAuth,
	formID: FormID,
	isPreview: boolean,
	fileUploadOptions?: FileUploadOptions,
): ErrorReturnPromise<Form> {
	const formsAPI = google.forms({ version: 'v1', auth: googleAuth });

	const [gaxiosFormResponse, requestError] = await safePromise(() =>
		formsAPI.forms.get({
			formId: formID,
		}),
	);
	if (requestError) {
		return [null, requestError];
	}

	if (gaxiosFormResponse.status !== StatusCodes.OK) {
		return [null, new Error(`Google Forms API returned ${gaxiosFormResponse.status} status code. ${gaxiosFormResponse.statusText} ${gaxiosFormResponse.data}`)];
	}

	const googleAPIsForm = gaxiosFormResponse.data;

	// ==================================================
	// ==================================================
	// Here we adjust some IDs to make the form work.
	// To be specific we have to extract the "entry.<number>" id. This is is only present when one is viewing the form
	// in the browser. Because of that we have to do some we-scraping...

	const responseURI = googleAPIsForm.responderUri;
	const [questionSubmitIDs, errorGetQuestionSubmitIDs] = await getRealQuestionSubmitIDFromUndocumentedAPI(responseURI);
	if (errorGetQuestionSubmitIDs !== null) {
		return [null, errorGetQuestionSubmitIDs];
	}

	for (let i = 0; i < googleAPIsForm.items.length; i++) {
		googleAPIsForm.items[i].itemId = `entry.${String(questionSubmitIDs[i])}`;
	}
	// ==================================================
	// ==================================================

	const responderViewURL = new URL(googleAPIsForm.responderUri);

	const pathSegments = responderViewURL.pathname.split('/');
	const formResponderID = pathSegments[pathSegments.length - 2];

	const formResponsePostURL = `https://docs.google.com/forms/u/0/d/e/${formResponderID}/formResponse`;

	const form: Form = {
		googleAPIsForm: googleAPIsForm,
		formResponsePostURL,
	};

	const fileUploadQuestionsTitles: Set<string> = new Set();
	for (const item of googleAPIsForm.items) {
		if (!(item.title && isFileUploadQuestion(item.title))) {
			continue;
		}

		const questionTitle = getFileUploadQuestionTitle(item.title);
		if (fileUploadQuestionsTitles.has(questionTitle)) {
			return [null, new Error(`Duplicate file upload question title: ${questionTitle}`)];
		}
		fileUploadQuestionsTitles.add(questionTitle);
	}

	// Handle file upload questions
	if (fileUploadQuestionsTitles.size > 0) {
		const fileUploadQuestionsFolders: Record<string, FolderID> = {};
		if (!fileUploadOptions) {
			return [null, new Error('File upload options were not provided while this form requires form upload. Call up your Digital team.')];
		}

		const [rootUploadFolderList, rootUploadFolderListError] = await internalListFolderNoCache(googleAuth, fileUploadOptions.targetGoogleDriveFolderID);
		if (rootUploadFolderListError) {
			return [null, rootUploadFolderListError];
		}

		for (const resource of rootUploadFolderList) {
			if (!isFolder(resource)) {
				continue;
			}
			const folder = resource;

			if (fileUploadQuestionsTitles.has(folder.name)) {
				fileUploadQuestionsFolders[folder.name] = folder.id;
				fileUploadQuestionsTitles.delete(folder.name);
			}
		}

		for (const questionTitle of fileUploadQuestionsTitles) {
			const [createfolderID, createFolderError] = await createFolder(googleAuth, fileUploadOptions.targetGoogleDriveFolderID, questionTitle);
			if (createFolderError) {
				return [null, createFolderError];
			}

			fileUploadQuestionsFolders[questionTitle] = createfolderID;
		}

		form.fileUpload = {
			coriodersFormUploadWorkerURL: fileUploadOptions.coriodersFormUploadWorkerURL,
			fileUploadQuestionsFolders: fileUploadQuestionsFolders,
		};
	}

	if (isPreview) {
		return [form, null];
	}

	if (googleAPIsForm.publishSettings?.publishState?.isPublished !== true && googleAPIsForm.publishSettings?.publishState?.isAcceptingResponses !== false) {
		return [null, new Error('While not in preview mode: Form is not published or accepting responses... Is this the expected behavior?')];
	}

	return [form, null];
});

async function getRealQuestionSubmitIDFromUndocumentedAPI(responseURI: string): ErrorReturnPromise<number[]> {
	const [formResponse, formResponseError] = await safePromise(() => fetch(responseURI));
	if (formResponseError) {
		return [null, formResponseError];
	}

	const [formResponseText, formResponseTextError] = await safePromise(() => formResponse.text());
	if (formResponseTextError) {
		return [null, formResponseTextError];
	}

	let data = formResponseText.split('FB_PUBLIC_LOAD_DATA_ = ')[1];
	data = data.substring(0, data.indexOf(';'));
	const parsedData = JSON.parse(data) as unknown[];
	const flattenedData = parsedData.flat(100);

	const ids: number[] = [];
	for (let i = 0; i < flattenedData.length; i++) {
		if (typeof flattenedData[i] !== 'string') {
			continue;
		}

		const id = flattenedData[i + 3];
		if (typeof id !== 'number') {
			continue;
		}

		ids.push(id);
	}

	const filteredIds = ids.filter((id) => id !== 0 && id !== 1);

	return [filteredIds, null];
}
