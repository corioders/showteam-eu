import { type drive_v3, google } from "googleapis";
import { createAPIRequest, type GoogleAuth } from "googleapis-common";

import { type ErrorReturnPromise, safePromise } from "@/error/index.js";
import type { EmailAddress } from "@/media/personal/index.js";

import { type FileID, type FolderID, internalListFolderNoCache, isFolder, type PermissionRole, type PermissionType } from "./drive.js";
import type { ResourceID } from "./resource.js";

// TODO: MAKE THIS SAFE WITH safePromise
export async function internalSimpleFileUpload(googleAuth: GoogleAuth, folderID: FolderID, file: File): ErrorReturnPromise<FileID> {
	// ADAPTED FROM: https://github.com/aynh/cloudflare-gdrive/blob/main/src/gdrive.ts
	const fileArrayBuffer = await file.arrayBuffer();
	const fileBuffer = Buffer.from(fileArrayBuffer);

	const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
	url.searchParams.append("fields", "id, name, mimeType, size, imageMediaMetadata");
	url.searchParams.append("uploadType", "resumable");
	url.searchParams.append("supportsAllDrives", "true");

	const fileMetadata = {
		mimeType: file.type,
		name: file.name,
		parents: [folderID],
	};

	const initResponse = await createAPIRequest({
		context: { _options: { auth: googleAuth } },
		options: {
			body: JSON.stringify(fileMetadata),
			method: "POST",
			url: url,
		},
		params: {},
		pathParams: [],
		requiredParams: [],
	});

	const putUrl = initResponse.headers["location"];
	if (!putUrl) {
		return [null, new Error("Put URL is not defined")];
	}

	const response = await fetch(putUrl, {
		body: fileBuffer,
		method: "PUT",
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

export async function internalCreateFolder(googleAuth: GoogleAuth, parentFolderId: FolderID, folderName: string): ErrorReturnPromise<FolderID> {
	console.log(`Creating folder parent: ${parentFolderId} name: ${folderName}`);
	const drive = google.drive({ auth: googleAuth, version: "v3" });

	// Create the new folder.
	const fileMetadata = {
		mimeType: "application/vnd.google-apps.folder",
		name: folderName,
		parents: [parentFolderId],
	};
	const [file, errorFile] = await safePromise(() =>
		drive.files.create({
			fields: "id",
			requestBody: fileMetadata,
			supportsAllDrives: true,
		}),
	);
	if (errorFile) {
		return [null, new Error("Error while creating folder", { cause: errorFile })];
	}

	const newFolderId = file.data.id as FolderID;
	return [newFolderId, null];
}

export interface GetFolderIDorCreateIfNotExistentReturn {
	folderID: FolderID;
	created: boolean;
}

export async function internalGetFolderIDorCreateIfNotExistent(
	googleAuth: GoogleAuth,
	parentFolderID: FolderID,
	folderName: string,
): ErrorReturnPromise<GetFolderIDorCreateIfNotExistentReturn> {
	console.log(`createIfNotExist: parent: ${parentFolderID} name ${folderName}`);
	const drive = google.drive({ auth: googleAuth, version: "v3" });

	const [parentFolderList, errorParentFolderList] = await internalListFolderNoCache(googleAuth, parentFolderID);
	if (errorParentFolderList) {
		return [null, errorParentFolderList];
	}

	let foundFolderID: FolderID | null = null;
	for (const folder of parentFolderList) {
		if (!isFolder(folder)) {
			continue;
		}

		if (folder.name === folderName) {
			if (foundFolderID) {
				const errorMessage = `internalGetFolderIDorCreateIfNotExistent: Multiple folders with the same name ${folderName}. Parent folder ID: ${parentFolderID}.\nHint: remove the duplicate folders.`;
				return [null, new Error(errorMessage)];
			}
			foundFolderID = folder.id;
		}
	}

	if (foundFolderID) {
		return [{ created: false, folderID: foundFolderID }, null];
	}

	console.log(`createIfNotExist creating... ${parentFolderID} name: ${folderName}`);

	// Create the new folder.
	const folderMetadata = {
		mimeType: "application/vnd.google-apps.folder",
		name: folderName,
		parents: [parentFolderID],
	};
	const [folder, errorFolder] = await safePromise(() =>
		drive.files.create({
			fields: "id",
			requestBody: folderMetadata,
			supportsAllDrives: true,
		}),
	);
	if (errorFolder) {
		return [null, new Error("Error while creating folder", { cause: errorFolder })];
	}

	// TODO
	// To prevent race conditions (or to minimize them) we should fist, add random sleep before listing.
	// Plus list the parent again and figure out if we have 2 folders or one. Google Drive allows for two folders of the same name

	const newFolderID = folder.data.id as FolderID;
	return [{ created: true, folderID: newFolderID }, null];
}

export async function internalCopyPermissions(googleAuth: GoogleAuth, sourceResourceID: ResourceID, targetResourceID: ResourceID): Promise<Error | null> {
	const drive = google.drive({ auth: googleAuth, version: "v3" });

	await internalClearAllPermissions(googleAuth, targetResourceID);

	const [permissionsResponse, errorPermissionsResponse] = await safePromise(() =>
		drive.permissions.list({
			fields: "permissions(id, type, role, emailAddress, domain)",
			fileId: sourceResourceID,
			pageSize: 100,
			supportsAllDrives: true,
		}),
	);
	if (errorPermissionsResponse) {
		return new Error("Error while getting permissions", { cause: errorPermissionsResponse });
	}

	const permissions = permissionsResponse.data.permissions;
	if (!permissions) {
		return new Error("Permissions are not defined");
	}

	// Check for "anyone" permissions (general access)
	const anyonePermission = permissions.find((p) => p.type === "anyone");

	if (anyonePermission) {
		const newAnyonePermission: drive_v3.Schema$Permission = {
			role: anyonePermission.role as string | null,
			type: "anyone",
		};

		const [_, errorCreateAnyonePermission] = await safePromise(() =>
			drive.permissions.create({
				fields: "id",
				fileId: targetResourceID,
				requestBody: newAnyonePermission,
				supportsAllDrives: true,
			}),
		);

		if (errorCreateAnyonePermission) {
			return new Error("Error creating 'anyone' permission", { cause: errorCreateAnyonePermission });
		}
	}

	for (const permission of permissions) {
		// Skip the owner permission when applying to the new folder, as the
		// owner will be the user creating the folder.
		if (permission.role === "owner") {
			continue;
		}

		// Skip "anyone" (already handled)
		if (permission.type === "anyone") {
			continue;
		}

		const newPermission: drive_v3.Schema$Permission = {
			role: permission.role as string | null,
			type: permission.type as string | null,
		};

		if (permission.type === "user") {
			newPermission.emailAddress = permission.emailAddress as string | null;
		}
		if (permission.type === "group") {
			newPermission.emailAddress = permission.emailAddress as string | null;
		}
		if (permission.type === "domain") {
			newPermission.domain = permission.domain as string | null;
		}

		const [_, errorCreatePermission] = await safePromise(() =>
			drive.permissions.create({
				fields: "id",
				fileId: targetResourceID,
				requestBody: newPermission,
				supportsAllDrives: true,
			}),
		);
		if (errorCreatePermission) {
			return new Error("Error while creating permission", { cause: errorCreatePermission });
		}
	}
	// ==================================================

	return null;
}

export async function internalClearAllPermissions(googleAuth: GoogleAuth, targetResourceID: ResourceID, except?: EmailAddress[]): Promise<Error | null> {
	const drive = google.drive({ auth: googleAuth, version: "v3" });

	const [targetPermissionsResponse, errorTargetPermissionsResponse] = await safePromise(() =>
		drive.permissions.list({
			fields: "permissions(id, type, role, emailAddress)",
			fileId: targetResourceID,
			supportsAllDrives: true,
		}),
	);
	if (errorTargetPermissionsResponse) {
		return new Error("Error getting target permissions", { cause: errorTargetPermissionsResponse });
	}

	const targetPermissions = targetPermissionsResponse.data.permissions;
	if (!targetPermissions) {
		return new Error("targetPermissions are not defined");
	}

	for (const permission of targetPermissions) {
		if (permission.role === "owner") {
			continue;
		}

		if (except?.includes(permission.emailAddress as EmailAddress)) {
			continue;
		}

		const [_, errorDeletePermission] = await safePromise(() =>
			drive.permissions.delete({
				fileId: targetResourceID,
				permissionId: permission.id as string,
				supportsAllDrives: true,
			}),
		);

		if (errorDeletePermission) {
			return new Error(`Error deleting permission ${permission.id}`, { cause: errorDeletePermission });
		}
	}

	return null;
}

export async function internalAddPermission(
	googleAuth: GoogleAuth,
	targetResourceID: ResourceID,
	emailAddress: string,
	permissionRole: PermissionRole,
	permissionType: PermissionType = "user",
): Promise<Error | null> {
	console.log(`Adding permission ${targetResourceID} ${emailAddress} ${permissionRole} ${permissionType}`);
	const drive = google.drive({ auth: googleAuth, version: "v3" });

	const newPermission: drive_v3.Schema$Permission = {
		emailAddress: emailAddress,
		role: permissionRole,
		type: permissionType,
	};

	const [_, errorCreatePermission] = await safePromise(() =>
		drive.permissions.create({
			fields: "id",
			fileId: targetResourceID,
			requestBody: newPermission,
			supportsAllDrives: true,
		}),
	);
	if (errorCreatePermission) {
		return new Error("Error while creating permission", { cause: errorCreatePermission });
	}

	return null;
}
