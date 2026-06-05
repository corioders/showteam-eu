// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { google } from "googleapis";
import { createAPIRequest, type GoogleAuth } from "googleapis-common";
import { StatusCodes } from "http-status-codes";

import { CSE, type ErrorReturn, type ErrorReturnPromise, safe, safePromise, unreachableErrorMessage } from "@/error";
import type { AssertJsonValue } from "@/format/json/index.js";

import { memoizeDriveCMS, type PersistentCacheController, persistentDriveCMSCache } from "./cache.js";
import { DEPLOY_REVISION_NAME } from "./const.js";
import { MIMEType, type MIMETypeT, type MIMETypeTE, type Resource, type ResourceID } from "./resource.js";

export type FolderID = ResourceID & { readonly __folderTag: unique symbol };
export type FileID = ResourceID & { readonly __fileTag: unique symbol };

export type RevisionID = number & { readonly __revisionTag: unique symbol };

// https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions#Permission
export type PermissionRole = "reader" | "commenter" | "writer" | "fileOrganizer" | "organizer" | "owner";
export type PermissionType = "user" | "group" | "domain" | "anyone";

export interface FolderResource extends Resource {
	id: FolderID;
	mimeType: MIMETypeT["folder"];
}

export interface FileResource extends Resource {
	id: FileID;
	mimeType: MIMETypeT["csv"] | MIMETypeT["markdown"];
}

export function isFolder(resource: Resource): resource is FolderResource {
	return resource.mimeType === MIMEType.folder;
}

export function folderResourceFromFolderID(folderID: FolderID): FolderResource {
	return {
		id: folderID,
		mimeType: MIMEType.folder,
		name: "NO_NAME__FOLDER_RESOURCE_FROM_FOLDER_ID",
	};
}

export const ERR_UNABLE_CHANGE_PERMISSION = new Error("Unable change permission");
export const internalUNSAFEChangePermissionsToAnyoneWithLinkReader = memoizeDriveCMS(async function internalUNSAFEChangePermissionsToAnyoneWithLinkReader(
	googleAuth: GoogleAuth,
	fileID: FileID,
): ErrorReturnPromise<void, Error | null> {
	const driveAPI = google.drive({ auth: googleAuth, version: "v3" });

	const response = await driveAPI.permissions.create({
		fileId: fileID,
		requestBody: {
			allowFileDiscovery: false,
			role: "reader",
			type: "anyone",
		},
		supportsAllDrives: true,
	});

	if (response.status !== StatusCodes.OK) {
		return [null, new AggregateError([ERR_UNABLE_CHANGE_PERMISSION, new Error(response.statusText)])];
	}

	return [null, null];
});

export const ERR_UNABLE_TO_LIST_FILES = new Error("Unable to list files");
export const internalListFolderPersistentCached: (googleAuth: GoogleAuth, folderID: FolderID) => ErrorReturnPromise<Resource[]> = persistentDriveCMSCache(
	"internalListFolderPersistent",
	null,
	async function internalListFolder(
		persistentCacheController: PersistentCacheController<AssertJsonValue<Resource[]>>,
		googleAuth: GoogleAuth,
		folderID: FolderID,
	): ErrorReturnPromise<Resource[]> {
		const [cachedValue, cacheError] = await persistentCacheController.getCachedValue();
		if (cacheError) {
			return [null, cacheError];
		}

		if (cachedValue) {
			return [cachedValue, null];
		}

		const [listResult, listError] = await internalListFolderNoCache(googleAuth, folderID);
		if (listError) {
			return [null, listError];
		}

		const cacheSetError = await persistentCacheController.setCachedValue(listResult);
		if (cacheSetError) {
			return [null, cacheSetError];
		}

		return [listResult, null];
	},
);

export async function internalListFolderNoCache(googleAuth: GoogleAuth, folderID: FolderID): ErrorReturnPromise<Resource[]> {
	console.log(`Listing folder: ${folderID}`);

	const driveAPI = google.drive({ auth: googleAuth, version: "v3" });
	const [fileOrFolderListResponse, errorList] = await safePromise(() =>
		driveAPI.files.list({
			fields: "files(id, name, mimeType, shortcutDetails(targetId))",
			includeItemsFromAllDrives: true,
			q: `'${folderID}' in parents`,
			supportsAllDrives: true,
		}),
	);
	if (errorList !== null) {
		return [null, new Error(`Error while listing files: ${errorList}`, { cause: errorList })];
	}

	const fileOrFolderList: Resource[] = [];
	if (fileOrFolderListResponse.status !== StatusCodes.OK || fileOrFolderListResponse.data.files === undefined) {
		return [null, new CSE(ERR_UNABLE_TO_LIST_FILES)];
	}

	for (const fileOrFolder of fileOrFolderListResponse.data.files) {
		if (typeof fileOrFolder.name !== "string") {
			return [null, new Error(`fileOrFolder.name is not of type string. But of type: ${typeof fileOrFolder.name}`)];
		}

		// ==================================================
		// Shortcut resolution
		//
		// We should not be falling into recursive folder trees, because we are only resolving one step deep.
		if (fileOrFolder.mimeType === MIMEType.shortcut) {
			const shortcutTargetID = fileOrFolder.shortcutDetails?.targetId;
			if (typeof shortcutTargetID !== "string") {
				return [null, new Error("fileOrFolder.mimeType is MIMEType.shortcut but fileOrFolder.shortcutDetails are undefined.")];
			}

			const [targetFileResponse, targetFileFetchError] = await safePromise(() =>
				driveAPI.files.get({
					fields: "id, name, mimeType",
					fileId: shortcutTargetID,
					supportsAllDrives: true,
				}),
			);
			if (targetFileFetchError || targetFileResponse.status !== StatusCodes.OK || targetFileResponse.data.id === undefined) {
				return [
					null,
					new Error(`Unable to resolve shortcut. Error: ${targetFileFetchError}. Status: ${targetFileResponse?.statusText}`, { cause: targetFileFetchError }),
				];
			}

			const targetFile = targetFileResponse.data;
			if (typeof targetFile.name !== "string") {
				return [null, new Error(`Unable to resolve shortcut. targetFile.name is not of type string. But of type: ${typeof fileOrFolder.name}`)];
			}

			fileOrFolderList.push({
				id: targetFile.id as ResourceID,
				mimeType: targetFile.mimeType as MIMETypeTE,
				// Leave the shortcut name.
				name: fileOrFolder.name,
			});

			continue;
		}

		fileOrFolderList.push({
			id: fileOrFolder.id as ResourceID,
			mimeType: fileOrFolder.mimeType as MIMETypeTE,
			name: fileOrFolder.name,
		});
	}

	return [fileOrFolderList, null];
}

// downloadFile should not be cached
// Functions calling downloadFile should be cached. This is because sometimes downloadFile returns HUGE files that are later processed and saved much smaller to disk.
export const downloadFile = memoizeDriveCMS(async function downloadFile<T = unknown>(
	googleAuth: GoogleAuth,
	fileID: FileID,
	revisionID?: RevisionID,
	mimeType?: MIMETypeTE,
): ErrorReturnPromise<T> {
	console.log(`Downloading ${fileID}${mimeType && ` MIME: ${mimeType}`}${revisionID && ` REVISION: ${revisionID}`}`);

	const [downloadURL, errorGetFileURL] = await getFileDownloadURL(googleAuth, fileID, revisionID, mimeType);
	if (errorGetFileURL !== null) {
		return [null, errorGetFileURL];
	}

	const [downloadResponse, errorDownloadFile] = await safePromise(() =>
		createAPIRequest({
			context: { _options: { auth: googleAuth } },
			options: {
				method: "GET",
				url: downloadURL,
			},
			params: {},
			pathParams: [],
			requiredParams: [],
		}),
	);
	if (errorDownloadFile !== null) {
		return [null, errorDownloadFile];
	}

	// TODO: We don't know downloadResponse.data is T
	return [downloadResponse.data as T, null];
});

// This function should not be cached because we are not caching downloadFile
// getFileDownloadURL is used only in downloadFile
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
		return createAPIRequest<Operation>({
			context: { _options: { auth: googleAuth } },
			options: {
				method: "POST",
				url: `https://www.googleapis.com/drive/v3/files/${fileID}/download`,
			},
			params: {
				mimeType: mimeType,
				revisionId: revisionID,
			},
			pathParams: [],
			requiredParams: [],
		});
	});
	if (errorGaxios !== null) {
		return [null, new Error("Gaxios API request failed", { cause: errorGaxios })];
	}

	const downloadURL = downloadURIResponse.data.response.downloadUri;
	return [downloadURL, null];
});

export interface Revision {
	name?: string;
	revisionID: RevisionID;
}

// TODO: Consider Download ALL revisions: Look at the url: "revisionBatchSize"
export const getRevisionsFromUndocumentedAPIPersistentCached: (googleAuth: GoogleAuth, undocumentedRevisionURL: string) => ErrorReturnPromise<Revision[]> =
	persistentDriveCMSCache(
		"getRevisionsFromUndocumentedAPI",
		null,
		async function getRevisionsFromUndocumentedAPI(
			persistentCacheController: PersistentCacheController<AssertJsonValue<Revision[]>>,
			googleAuth: GoogleAuth,
			undocumentedRevisionURL: string,
		): ErrorReturnPromise<Revision[]> {
			// ==================================================
			// Cache
			const [cachedValue, cacheError] = await persistentCacheController.getCachedValue();
			if (cacheError) {
				return [null, cacheError];
			}

			if (cachedValue) {
				return [cachedValue, null];
			}

			console.log("getRevisionsFromUndocumentedAPI", undocumentedRevisionURL);

			const [response, errorGaxios] = await safePromise(() => {
				return createAPIRequest<string>({
					context: { _options: { auth: googleAuth } },
					options: {
						method: "GET",
						url: undocumentedRevisionURL,
					},
					params: {},
					pathParams: [],
					requiredParams: [],
				});
			});
			if (errorGaxios !== null) {
				return [null, new Error("Gaxios API request failed", { cause: errorGaxios })];
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

			const jsonDataString = response.data.split("\n")[1];
			if (!jsonDataString) {
				return [null, new Error(unreachableErrorMessage("jsonDataString is not defined. Google changed their code"))];
			}
			const [responseJson, errorJson] = safe(() => JSON.parse(jsonDataString) as ResponseJson);
			if (errorJson !== null) {
				return [null, new Error("Unable to json parse response data", { cause: errorJson })];
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

			// ==================================================
			// Cache
			const cacheSetError = await persistentCacheController.setCachedValue(sortedRevisions);
			if (cacheSetError) {
				return [null, cacheSetError];
			}

			return [sortedRevisions, null];
		},
	);

export const ERR_REVISIONS_LENGTH_IS_ZERO = new Error("Error: revisions.length === 0");
export function getLatestRevision(revisions: Revision[]): ErrorReturn<Revision> {
	if (revisions.length === 0) {
		return [null, new CSE(ERR_REVISIONS_LENGTH_IS_ZERO)];
	}

	const latestRevision = revisions.at(-1);
	if (!latestRevision) {
		return [null, new Error(unreachableErrorMessage("Cannot get latestRevision"))];
	}

	return [latestRevision, null];
}

export const ERR_UNABLE_TO_GET_LATEST_DEPLOY_REVISION = new Error("Error: unable to get latest deploy revision");
export function getLatestDeployRevision(revisions: Revision[]): ErrorReturn<Revision> {
	let latestDeployRevision: Revision | null = null;
	for (let i = revisions.length - 1; i >= 0; i--) {
		const revision = revisions[i] as Revision;
		if (revision.name?.toLowerCase() !== DEPLOY_REVISION_NAME) {
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
