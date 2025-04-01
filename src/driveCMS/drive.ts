// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { CSE, type ErrorReturn, type ErrorReturnPromise, safe, safePromise } from '@/error';
import type { ValueOf } from '@/type';
import { google } from 'googleapis';
import { type GaxiosPromise, type GoogleAuth, createAPIRequest } from 'googleapis-common';
import { StatusCodes } from 'http-status-codes';
import { DEPLOY_REVISION_NAME } from './const.js';

// ResourceID is an ID of Folder or File
export type ResourceID = string & { readonly __resourceTag: unique symbol };

export type FolderID = ResourceID & { readonly __folderTag: unique symbol };
export type FileID = ResourceID & { readonly __fileTag: unique symbol };

export type RevisionID = number & { readonly __revisionTag: unique symbol };

// https://developers.google.com/drive/api/guides/ref-export-formats
export type MIMETypeT = ValueOf<typeof MIMEType>;
export const MIMEType = {
	csv: 'text/csv',
	folder: 'application/vnd.google-apps.folder',

	docs: 'application/vnd.google-apps.document',
	markdown: 'text/markdown',
	excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export interface Resource {
	id: ResourceID;
	name: string;
	mimeType: MIMETypeT;
}

export const ERR_UNABLE_CHANGE_PERMISSION = new Error('Unable change permission');
export async function internalUNSAFEChangePermissionsToAnyoneWithLinkReader(googleAuth: GoogleAuth, fileID: FileID): ErrorReturnPromise<void> {
	const driveAPI = google.drive({ version: 'v3', auth: googleAuth });

	const response = await driveAPI.permissions.create(
		{
			fileId: fileID,
			requestBody: {
				type: 'anyone',
				role: 'reader',
				allowFileDiscovery: false,
			},
		},
		null,
	);

	if (response.status !== StatusCodes.OK) {
		return [null, new AggregateError([ERR_UNABLE_CHANGE_PERMISSION, new Error(response.statusText)])];
	}

	return [null, null];
}

export const ERR_UNABLE_TO_LIST_FILES = new Error('Unable to list files');
export async function internalListFolder(googleAuth: GoogleAuth, folderID: FolderID): ErrorReturnPromise<Resource[]> {
	const driveAPI = google.drive({ version: 'v3', auth: googleAuth });
	const [fileOrFolderListResponse, errorList] = await safePromise(() => driveAPI.files.list({ q: `'${folderID}' in parents` }));
	if (errorList !== null) {
		return [null, new Error('Error while listing files', { cause: errorList })];
	}

	const fileOrFolderList: Resource[] = [];
	if (fileOrFolderListResponse.status !== 200 || fileOrFolderListResponse.data.files === undefined) {
		return [null, new CSE(ERR_UNABLE_TO_LIST_FILES)];
	}

	for (const fileOrFolder of fileOrFolderListResponse.data.files) {
		fileOrFolderList.push({
			id: fileOrFolder.id as ResourceID,
			name: fileOrFolder.name,
			mimeType: fileOrFolder.mimeType as MIMETypeT,
		});
	}

	return [fileOrFolderList, null];
}

export async function downloadFile(googleAuth: GoogleAuth, fileID: FileID, revisionID?: RevisionID, mimeType?: MIMETypeT): ErrorReturnPromise<unknown> {
	const [downloadURL, errorGetFileURL] = await getFileDownloadURL(googleAuth, fileID, revisionID, mimeType);
	if (errorGetFileURL !== null) {
		return [null, errorGetFileURL];
	}

	const [downloadResponse, errorDownloadFile] = await safePromise(() =>
		createAPIRequest({
			options: {
				url: downloadURL,
				method: 'GET',
			},
			params: {},
			requiredParams: [],
			pathParams: [],
			context: { _options: { auth: googleAuth } },
		}),
	);
	if (errorDownloadFile !== null) {
		return [null, errorDownloadFile];
	}

	return [downloadResponse.data, null];
}

export async function getFileDownloadURL(googleAuth: GoogleAuth, fileID: FileID, revisionID?: RevisionID, mimeType?: MIMETypeT): ErrorReturnPromise<string> {
	// https://developers.google.com/drive/api/reference/rest/v3/operations#Operation
	interface Operation {
		response: {
			downloadUri: string;
		};
	}

	const [downloadURIResponse, errorGaxios] = await safePromise(() => {
		return createAPIRequest({
			options: {
				url: `https://www.googleapis.com/drive/v3/files/${fileID}/download`,
				method: 'POST',
			},
			params: {
				revisionId: revisionID,
				mimeType: mimeType,
			},
			requiredParams: [],
			pathParams: [],
			context: { _options: { auth: googleAuth } },
		}) as GaxiosPromise<Operation>;
	});
	if (errorGaxios !== null) {
		return [null, new Error('Gaxios API request failed', { cause: errorGaxios })];
	}

	const downloadURL = downloadURIResponse.data.response.downloadUri;
	return [downloadURL, null];
}

export interface Revision {
	name?: string;
	revisionID: RevisionID;
}

// TODO: Consider Download ALL revisions: Look at the url: "revisionBatchSize"
export async function getRevisionsFromUndocumentedAPI(googleAuth: GoogleAuth, undocumentedRevisionURL: string): ErrorReturnPromise<Revision[]> {
	const [response, errorGaxios] = await safePromise(() => {
		return createAPIRequest({
			options: {
				url: undocumentedRevisionURL,
				method: 'GET',
			},
			params: {},
			requiredParams: [],
			pathParams: [],
			context: { _options: { auth: googleAuth } },
		}) as GaxiosPromise<string>;
	});
	if (errorGaxios !== null) {
		return [null, new Error('Gaxios API request failed', { cause: errorGaxios })];
	}

	interface ResponseJson {
		firstRev: number;
		tileInfo: {
			// start: number,
			end: number; // RevisionID
			// endMillis: 1728041024168,
			// users: [Array],
			// systemRevs: [],
			name?: string;
			// expandable: false,
			// revisionMac: "VKrkaCV8b4GjzA",
		}[];
	}

	const jsonDataString = response.data.split('\n')[1];
	const [responseJson, errorJson] = safe(() => JSON.parse(jsonDataString) as ResponseJson);
	if (errorJson !== null) {
		return [null, new Error('Unable to json parse response data', { cause: errorJson })];
	}

	const revisions: Revision[] = [];
	for (const responseRevision of responseJson.tileInfo) {
		revisions.push({
			revisionID: responseRevision.end as RevisionID,
			name: responseRevision.name,
		});
	}

	const sortedRevisions = revisions.sort((a, b) => a.revisionID - b.revisionID);
	return [sortedRevisions, null];
}

export const ERR_REVISIONS_LENGTH_IS_ZERO = new Error('Error: revisions.length === 0');
export function getLatestRevision(revisions: Revision[]): ErrorReturn<Revision> {
	if (revisions.length === 0) {
		return [null, new CSE(ERR_REVISIONS_LENGTH_IS_ZERO)];
	}

	const latestRevision = revisions[revisions.length - 1];
	return [latestRevision, null];
}

export const ERR_UNABLE_TO_GET_LATEST_DEPLOY_REVISION = new Error('Error: unable to get latest deploy revision');
export function getLatestDeployRevision(revisions: Revision[]): ErrorReturn<Revision> {
	let latestDeployRevision: Revision | null = null;
	for (let i = revisions.length - 1; i >= 0; i--) {
		const revision = revisions[i];
		if (revision.name !== DEPLOY_REVISION_NAME) {
			continue;
		}

		latestDeployRevision = revision;
		break;
	}

	if (latestDeployRevision === null) {
		return [null, new CSE(ERR_UNABLE_TO_GET_LATEST_DEPLOY_REVISION)];
	}

	return [latestDeployRevision, null];
}
