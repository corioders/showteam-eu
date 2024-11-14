// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import type { ValueOf } from '@/type';
import { google } from 'googleapis';
import { type GaxiosResponse, type GoogleAuth, createAPIRequest } from 'googleapis-common';

// ResourceID is an ID of Folder or Fil
export type ResourceID = string & { readonly '': unique symbol };

export type RevisionID = number & { readonly '': unique symbol };

// https://developers.google.com/drive/api/guides/ref-export-formats
export type MIMETypeT = ValueOf<typeof MIMEType>;
export const MIMEType = {
	csv: 'text/csv',
	excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	folder: 'application/vnd.google-apps.folder',
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
