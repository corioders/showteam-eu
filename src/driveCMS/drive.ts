// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { CSE, type ErrorReturn, type ErrorReturnPromise, UnreachableErrorMessage, safe, safePromise } from '@/error';
import { type drive_v3, google } from 'googleapis';
import { type GaxiosPromise, type GoogleAuth, createAPIRequest } from 'googleapis-common';
import { StatusCodes } from 'http-status-codes';
import { memoizeDriveCMS } from './cache.js';
import { DEPLOY_REVISION_NAME } from './const.js';
import type { EmailAddress } from './index.js';
import { MIMEType, type MIMETypeT, type MIMETypeTE, type Resource, type ResourceID } from './resource.js';

export type FolderID = ResourceID & { readonly __folderTag: unique symbol };
export type FileID = ResourceID & { readonly __fileTag: unique symbol };

export type RevisionID = number & { readonly __revisionTag: unique symbol };

// https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions#Permission
export type PermissionRole = 'reader' | 'commenter' | 'writer' | 'fileOrganizer' | 'organizer' | 'owner';
export type PermissionType = 'user' | 'group' | 'domain' | 'anyone';

export interface FolderResource extends Resource {
	id: FolderID;
	mimeType: MIMETypeT['folder'];
}

export interface FileResource extends Resource {
	id: FileID;
	mimeType: MIMETypeT['csv'] | MIMETypeT['markdown'];
}

export function isFolder(resource: Resource): resource is FolderResource {
	return resource.mimeType === MIMEType.folder;
}

export function folderResourceFromFolderID(folderID: FolderID): FolderResource {
	return {
		id: folderID,
		name: 'NO_NAME__FOLDER_RESOURCE_FROM_FOLDER_ID',
		mimeType: MIMEType.folder,
	};
}

export const ERR_UNABLE_CHANGE_PERMISSION = new Error('Unable change permission');
export const internalUNSAFEChangePermissionsToAnyoneWithLinkReader = memoizeDriveCMS(async function internalUNSAFEChangePermissionsToAnyoneWithLinkReader(
	googleAuth: GoogleAuth,
	fileID: FileID,
): ErrorReturnPromise<void, Error | null> {
	const driveAPI = google.drive({ version: 'v3', auth: googleAuth });

	const response = await driveAPI.permissions.create({
		fileId: fileID,
		requestBody: {
			type: 'anyone',
			role: 'reader',
			allowFileDiscovery: false,
		},
	});

	if (response.status !== StatusCodes.OK) {
		return [null, new AggregateError([ERR_UNABLE_CHANGE_PERMISSION, new Error(response.statusText)])];
	}

	return [null, null];
});

export const ERR_UNABLE_TO_LIST_FILES = new Error('Unable to list files');
export const internalListFolder = memoizeDriveCMS(internalListFolderNoCache);
export async function internalListFolderNoCache(googleAuth: GoogleAuth, folderID: FolderID): ErrorReturnPromise<Resource[]> {
	console.log(`Listing folder: ${folderID}`);

	const driveAPI = google.drive({ version: 'v3', auth: googleAuth });
	const [fileOrFolderListResponse, errorList] = await safePromise(() => driveAPI.files.list({ q: `'${folderID}' in parents` }));
	if (errorList !== null) {
		return [null, new Error(`Error while listing files: ${errorList}`, { cause: errorList })];
	}

	const fileOrFolderList: Resource[] = [];
	if (fileOrFolderListResponse.status !== 200 || fileOrFolderListResponse.data.files === undefined) {
		return [null, new CSE(ERR_UNABLE_TO_LIST_FILES)];
	}

	for (const fileOrFolder of fileOrFolderListResponse.data.files) {
		if (typeof fileOrFolder.name !== 'string') {
			return [null, new Error(`fileOrFolder.name is not of type string. But of type: ${typeof fileOrFolder.name}`)];
		}
		fileOrFolderList.push({
			id: fileOrFolder.id as ResourceID,
			name: fileOrFolder.name,
			mimeType: fileOrFolder.mimeType as MIMETypeTE,
		});
	}

	return [fileOrFolderList, null];
}

export const downloadFile = memoizeDriveCMS(async function downloadFile(
	googleAuth: GoogleAuth,
	fileID: FileID,
	revisionID?: RevisionID,
	mimeType?: MIMETypeTE,
): ErrorReturnPromise<unknown> {
	console.log(`Downloading ${fileID}${mimeType && ` MIME: ${mimeType}`}${revisionID && ` REVISION: ${revisionID}`}`);

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
});

export const getFileDownloadURL = memoizeDriveCMS(async function getFileDownloadURL(
	googleAuth: GoogleAuth,
	fileID: FileID,
	revisionID?: RevisionID,
	mimeType?: MIMETypeTE,
): ErrorReturnPromise<string> {
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
});

export interface Revision {
	name?: string;
	revisionID: RevisionID;
}

// TODO: Consider Download ALL revisions: Look at the url: "revisionBatchSize"
export const getRevisionsFromUndocumentedAPI = memoizeDriveCMS(async function getRevisionsFromUndocumentedAPI(
	googleAuth: GoogleAuth,
	undocumentedRevisionURL: string,
): ErrorReturnPromise<Revision[]> {
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
	if (!jsonDataString) {
		return [null, new Error(UnreachableErrorMessage('jsonDataString is not defined. Google changed their code'))];
	}
	const [responseJson, errorJson] = safe(() => JSON.parse(jsonDataString) as ResponseJson);
	if (errorJson !== null) {
		return [null, new Error('Unable to json parse response data', { cause: errorJson })];
	}

	const revisions: Revision[] = [];
	for (const responseRevision of responseJson.tileInfo) {
		const newRevision: Revision = {
			revisionID: responseRevision.end as RevisionID,
		};
		if (responseRevision.name) {
			newRevision.name = responseRevision.name;
		}

		revisions.push(newRevision);
	}

	const sortedRevisions = revisions.sort((a, b) => a.revisionID - b.revisionID);
	return [sortedRevisions, null];
});

export const ERR_REVISIONS_LENGTH_IS_ZERO = new Error('Error: revisions.length === 0');
export function getLatestRevision(revisions: Revision[]): ErrorReturn<Revision> {
	if (revisions.length === 0) {
		return [null, new CSE(ERR_REVISIONS_LENGTH_IS_ZERO)];
	}

	const latestRevision = revisions[revisions.length - 1];
	if (!latestRevision) {
		return [null, new Error(UnreachableErrorMessage('Cannot get latestRevision'))];
	}

	return [latestRevision, null];
}

export const ERR_UNABLE_TO_GET_LATEST_DEPLOY_REVISION = new Error('Error: unable to get latest deploy revision');
export function getLatestDeployRevision(revisions: Revision[]): ErrorReturn<Revision> {
	let latestDeployRevision: Revision | null = null;
	for (let i = revisions.length - 1; i >= 0; i--) {
		const revision = revisions[i] as Revision;
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

// TODO: MAKE THIS SAFE WITH safePromise
export async function simpleFileUpload(googleAuth: GoogleAuth, folderID: FolderID, file: File): ErrorReturnPromise<FileID> {
	// ADAPTED FROM: https://github.com/aynh/cloudflare-gdrive/blob/main/src/gdrive.ts
	const fileArrayBuffer = await file.arrayBuffer();
	const fileBuffer = Buffer.from(fileArrayBuffer);

	const url = new URL('https://www.googleapis.com/upload/drive/v3/files');
	url.searchParams.append('fields', 'id, name, mimeType, size, imageMediaMetadata');
	url.searchParams.append('uploadType', 'resumable');
	url.searchParams.append('supportsAllDrives', 'true');

	const fileMetadata = {
		name: file.name,
		mimeType: file.type,
		parents: [folderID],
	};

	const initResponse = await createAPIRequest({
		options: {
			url: url,
			method: 'POST',
			body: JSON.stringify(fileMetadata),
		},
		params: {},
		requiredParams: [],
		pathParams: [],
		context: { _options: { auth: googleAuth } },
	});

	const putUrl = initResponse.headers['location'];

	const response = await fetch(putUrl, {
		body: fileBuffer,
		method: 'PUT',
	});

	const responseJson = await response.json();
	const fileID = responseJson.id as FileID;

	return [fileID, null];

	// OLD TRIES:
	// ==================================================
	// ==================================================
	// ==================================================
	// ==================================================
	// ==================================================

	// return response.json<GoogleDriveItem>();

	// const d = await fetch('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWD50M7cpv9rIscugWEmiT21xHeJrEwphaUA&s');
	// const arrayBuffer = await d.arrayBuffer();

	// const f = readFileSync('aaa.png');
	// const arrayBuffer = f;

	// const arrayBuffer = await file.arrayBuffer();

	// const readableStream = Stream.Readable.from(Buffer.from(arrayBuffer));
	// readableStream = Stream.Readable.from(Buffer.from(readableStream.read()));
	// const data = readableStream.read();
	// console.log(data)

	// // ==================================================
	// // ==================================================

	// const readableStream = Stream.Readable.from(Buffer.from([1, 2, 3, 4]));

	// const media = {
	// 	mimeType: 'image/jpeg',
	// 	body: readableStream,
	// };

	// // debugger;
	// console.log('drive.files.create');
	// const c = await drive.files.create({
	// 	requestBody: fileMetadata,
	// 	media: media,
	// 	fields: 'id',
	// });

	// console.log(c);

	// // ==================================================
	// // ==================================================

	// const driveAPI = google.drive({ version: 'v3', auth: googleAuth });

	// const arrayBuffer = await file.arrayBuffer();
	// const readableStream = Stream.Readable.from(Buffer.from(arrayBuffer));

	// const [uploadResponse, uploadResponseError] = await safePromise(() =>
	// 	driveAPI.files.create({
	// 		media: {
	// 			mimeType: file.type,
	// 			body: readableStream,
	// 		},
	// 		resource: {
	// 			// name: 'photo.jpg',
	// 			parents: [folderID],
	// 		},
	// 		fields: 'id',
	// 	}),
	// );

	// if (uploadResponseError) {
	// 	return [null, new Error('Error uploading file', { cause: uploadResponseError })];
	// }

	// const fileID = uploadResponse.data.id as FileID;
	// return [fileID, null];
}

export async function createFolder(googleAuth: GoogleAuth, parentFolderId: FolderID, folderName: string): ErrorReturnPromise<FolderID> {
	const drive = google.drive({ version: 'v3', auth: googleAuth });

	// Create the new folder.
	const fileMetadata = {
		name: folderName,
		mimeType: 'application/vnd.google-apps.folder',
		parents: [parentFolderId],
	};
	const [file, errorFile] = await safePromise(() =>
		drive.files.create({
			requestBody: fileMetadata,
			fields: 'id',
		}),
	);
	if (errorFile) {
		return [null, new Error('Error while creating folder', { cause: errorFile })];
	}

	const newFolderId = file.data.id as FolderID;
	return [newFolderId, null];
}

export async function copyPermissions(googleAuth: GoogleAuth, sourceResourceID: ResourceID, targetResourceID: ResourceID): Promise<Error | null> {
	const drive = google.drive({ version: 'v3', auth: googleAuth });

	await clearAllPermissions(googleAuth, targetResourceID);

	const [permissionsResponse, errorPermissionsResponse] = await safePromise(() =>
		drive.permissions.list({
			fileId: sourceResourceID,
			fields: 'permissions(id, type, role, emailAddress, domain)',
			pageSize: 100,
		}),
	);
	if (errorPermissionsResponse) {
		return new Error('Error while getting permissions', { cause: errorPermissionsResponse });
	}

	const permissions = permissionsResponse.data.permissions;
	if (!permissions) {
		return new Error('Permissions are not defined');
	}

	// Check for "anyone" permissions (general access)
	const anyonePermission = permissions.find((p) => p.type === 'anyone');

	if (anyonePermission) {
		const newAnyonePermission: drive_v3.Schema$Permission = {
			type: 'anyone',
			role: anyonePermission.role as string | null,
		};

		const [_, errorCreateAnyonePermission] = await safePromise(() =>
			drive.permissions.create({
				fileId: targetResourceID,
				requestBody: newAnyonePermission,
				fields: 'id',
			}),
		);

		if (errorCreateAnyonePermission) {
			return new Error("Error creating 'anyone' permission", { cause: errorCreateAnyonePermission });
		}
	}

	for (const permission of permissions) {
		// Skip the owner permission when applying to the new folder, as the
		// owner will be the user creating the folder.
		if (permission.role === 'owner') {
			continue;
		}

		// Skip "anyone" (already handled)
		if (permission.type === 'anyone') {
			continue;
		}

		const newPermission: drive_v3.Schema$Permission = {
			role: permission.role as string | null,
			type: permission.type as string | null,
		};

		if (permission.type === 'user') {
			newPermission.emailAddress = permission.emailAddress as string | null;
		}
		if (permission.type === 'group') {
			newPermission.emailAddress = permission.emailAddress as string | null;
		}
		if (permission.type === 'domain') {
			newPermission.domain = permission.domain as string | null;
		}

		const [_, errorCreatePermission] = await safePromise(() =>
			drive.permissions.create({
				fileId: targetResourceID,
				requestBody: newPermission,
				fields: 'id',
			}),
		);
		if (errorCreatePermission) {
			return new Error('Error while creating permission', { cause: errorCreatePermission });
		}
	}
	// ==================================================

	return null;
}

export async function clearAllPermissions(googleAuth: GoogleAuth, targetResourceID: ResourceID, except?: EmailAddress[]): Promise<Error | null> {
	const drive = google.drive({ version: 'v3', auth: googleAuth });

	const [targetPermissionsResponse, errorTargetPermissionsResponse] = await safePromise(() =>
		drive.permissions.list({
			fileId: targetResourceID,
			fields: 'permissions(id, type, role, emailAddress)',
		}),
	);
	if (errorTargetPermissionsResponse) {
		return new Error('Error getting target permissions', { cause: errorTargetPermissionsResponse });
	}

	const targetPermissions = targetPermissionsResponse.data.permissions;
	if (!targetPermissions) {
		return new Error('targetPermissions are not defined');
	}

	for (const permission of targetPermissions) {
		if (permission.role === 'owner') {
			continue;
		}

		if (except?.includes(permission.emailAddress as EmailAddress)) {
			continue;
		}

		const [_, errorDeletePermission] = await safePromise(() =>
			drive.permissions.delete({
				fileId: targetResourceID,
				permissionId: permission.id as string,
			}),
		);

		if (errorDeletePermission) {
			return new Error(`Error deleting permission ${permission.id}`, { cause: errorDeletePermission });
		}
	}

	return null;
}

export const addPermission = async function addPermission(
	googleAuth: GoogleAuth,
	targetResourceID: ResourceID,
	emailAddress: string,
	permissionRole: PermissionRole,
	permissionType: PermissionType = 'user',
): Promise<Error | null> {
	const drive = google.drive({ version: 'v3', auth: googleAuth });

	const newPermission: drive_v3.Schema$Permission = {
		role: permissionRole,
		type: permissionType,
		emailAddress: emailAddress,
	};

	const [_, errorCreatePermission] = await safePromise(() =>
		drive.permissions.create({
			fileId: targetResourceID,
			requestBody: newPermission,
			fields: 'id',
		}),
	);
	if (errorCreatePermission) {
		return new Error('Error while creating permission', { cause: errorCreatePermission });
	}

	return null;
};
