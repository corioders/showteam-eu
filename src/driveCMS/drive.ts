// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { CSE, type ErrorReturn, type ErrorReturnPromise, safe, safePromise } from '@/error';
import type { ValueOf } from '@/type';
import { google } from 'googleapis';
import { type GaxiosPromise, type GaxiosResponse, type GoogleAuth, createAPIRequest } from 'googleapis-common';
import { DEPLOY_REVISION_NAME } from './const';

// ResourceID is an ID of Folder or File
export type ResourceID = string & { readonly '': unique symbol };

export type RevisionID = number & { readonly '': unique symbol };

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

export async function listFolder(googleAuth: GoogleAuth, folderID: ResourceID): Promise<Resource[]> {
	const driveAPI = google.drive({ version: 'v3', auth: googleAuth });
	const fileOrFolderListResponse = await driveAPI.files.list({ q: `'${folderID}' in parents` });
	const fileOrFolderList: Resource[] = [];

	if (fileOrFolderListResponse.status !== 200) {
		throw new Error('fileListResponse.statusText !== 200');
	}

	if (fileOrFolderListResponse.data.files === undefined) {
		throw new Error('fileListResponse.data.files === undefined');
	}

	for (const fileOrFolder of fileOrFolderListResponse.data.files) {
		fileOrFolderList.push({
			id: fileOrFolder.id as ResourceID,
			name: fileOrFolder.name,
			mimeType: fileOrFolder.mimeType as MIMETypeT,
		});
	}

	return fileOrFolderList;
}

// TODO: Check if all responses succeeded
// TODO: Handle the edge case when fileID is actually a folderID. Example: 1W9Ubb6l8zWUEMhmyGaI8K6H7eDQHMOkJ
export async function downloadFile(googleAuth: GoogleAuth, fileID: ResourceID, revisionID?: RevisionID, mimeType?: MIMETypeT): Promise<unknown> {
	const downloadURL = await getFileDownloadURL(googleAuth, fileID, revisionID, mimeType);
	const downloadResponse = await createAPIRequest({
		options: {
			url: downloadURL,
			method: 'GET',
		},
		params: {},
		requiredParams: [],
		pathParams: [],
		context: { _options: { auth: googleAuth } },
	});

	return downloadResponse.data;
}

// TODO: Check if all responses succeeded
// TODO: Handle the edge case when fileID is actually a folderID. Example: 1W9Ubb6l8zWUEMhmyGaI8K6H7eDQHMOkJ
export async function getFileDownloadURL(googleAuth: GoogleAuth, fileID: ResourceID, revisionID?: RevisionID, mimeType?: MIMETypeT): Promise<string> {
	// https://developers.google.com/drive/api/reference/rest/v3/operations#Operation
	interface Operation {
		response: {
			downloadUri: string;
		};
	}

	const downloadURIResponse: GaxiosResponse<Operation> = await createAPIRequest({
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
	});
	const downloadURL = downloadURIResponse.data.response.downloadUri;

	return downloadURL;
}

export interface Revision {
	name?: string;
	revisionID: RevisionID;
}

// TODO: Download ALL revisions: Look at the url: "revisionBatchSize"
// TODO: We are dependeidng on revisions being returned in order
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

	return [revisions, null];
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
