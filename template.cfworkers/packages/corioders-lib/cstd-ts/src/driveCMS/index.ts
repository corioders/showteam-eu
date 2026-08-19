// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { google } from "googleapis";
import type { GoogleAuth } from "googleapis-common";

import { IS_PREVIEW } from "@/const.js";
import { type ErrorReturn, type ErrorReturnPromise, safe, safePromise } from "@/error";
import type { EmailAddress } from "@/media/personal/index.js";

import { memoizeDriveCMS } from "./cache.js";
import { type Doc, type DocID, type DocMd, downloadDocMarkdownRevision, downloadDocRevision, getDocRevisions } from "./docs.js";
import {
	type FileID,
	type FolderID,
	getLatestDeployRevision,
	getLatestRevision,
	internalListFolderPersistentCached,
	internalUNSAFEChangePermissionsToAnyoneWithLinkReader,
	type PermissionRole,
	type PermissionType,
} from "./drive.js";
import {
	type GetFolderIDorCreateIfNotExistentReturn,
	internalAddPermission,
	internalClearAllPermissions,
	internalCopyPermissions,
	internalCreateFolder,
	internalGetFolderIDorCreateIfNotExistent,
	internalSimpleFileUpload,
} from "./drive-modify.js";
import { type FileUploadOptions, type FormID, getForm as internalGetForm } from "./form.js";
import type { Form } from "./form-client-side.js";
import type { Resource, ResourceID } from "./resource.js";
import { downloadSpreadsheetRevision, getSheetRevisions, type Spreadsheet, type SpreadsheetID } from "./spreadsheet.js";

// ==================================================
// TODO: Make this code use parseDriveCMSKey function
if (typeof process.env["CORIODERS_DRIVE_CMS_KEY"] !== "string") {
	throw new Error(
		"Unable to initialize drive cms, missing the `CORIODERS_DRIVE_CMS_KEY` environment variable. See https://medium.com/@matheodaly.md/using-google-drive-api-with-python-and-a-service-account-d6ae1f6456c2",
	);
}

const [defaultDriveCMSJsonKey, defaultDriveCMSJsonKeyError] = safe(() => JSON.parse(process.env["CORIODERS_DRIVE_CMS_KEY"] as string));
if (defaultDriveCMSJsonKeyError) {
	throw new Error(`Unable to initialize drive cms, CORIODERS_DRIVE_CMS_KEY is not a valid JSON: ${defaultDriveCMSJsonKeyError.message}`, {
		cause: defaultDriveCMSJsonKeyError,
	});
}

export const DEFAULT_SERVICE_ACCOUNT_EMAIL = defaultDriveCMSJsonKey.client_email as EmailAddress;

// to make this work you have to enable
// Google Drive API
// Google Drive Activity API
const defaultGoogleAuth: GoogleAuth = new google.auth.GoogleAuth({
	credentials: defaultDriveCMSJsonKey,
	scopes: ["https://www.googleapis.com/auth/drive"],
});

// ==================================================

export function parseDriveCMSKeyFromEnv(envName: string): ErrorReturn<GoogleAuth> {
	const cmsKey = process.env[envName];

	if (typeof cmsKey !== "string") {
		const errorMessage = `Unable to initialize, missing the '${envName}' environment variable. See https://medium.com/@matheodaly.md/using-google-drive-api-with-python-and-a-service-account-d6ae1f6456c2`;
		return [null, new Error(errorMessage)];
	}

	return parseDriveCMSKey(cmsKey);
}

export function parseDriveCMSKey(cmsKeyJson: string): ErrorReturn<GoogleAuth> {
	const [parsedKey, errorParse] = safe(() => JSON.parse(cmsKeyJson));
	if (errorParse) {
		return [null, errorParse];
	}

	const client = new google.auth.GoogleAuth({
		credentials: parsedKey,
		scopes: ["https://www.googleapis.com/auth/drive"],
	});

	return [client, null];
}

export const getRequestAuthHeaders = memoizeDriveCMS(async function getRequestAuthHeaders(url: string): ErrorReturnPromise<Headers> {
	return safePromise(() => defaultGoogleAuth.getRequestHeaders(url));
});

export function getForm(formID: FormID, fileUploadOptions?: FileUploadOptions): ErrorReturnPromise<Form> {
	return internalGetForm(defaultGoogleAuth, formID, fileUploadOptions);
}

// const driveAPI = google.drive({ version: "v3", auth: googleAuth });
// const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

// Figure out if changing permissions of the folder would work.
export function UNSAFEChangePermissionsToAnyoneWithLinkReader(fileID: FileID): ErrorReturnPromise<void, Error | null> {
	return internalUNSAFEChangePermissionsToAnyoneWithLinkReader(defaultGoogleAuth, fileID);
}

export function listFolder(folderID: FolderID): ErrorReturnPromise<Resource[]> {
	return internalListFolderPersistentCached(defaultGoogleAuth, folderID);
}

export function downloadDocCorrectRevisionMarkdown(docID: DocID): ErrorReturnPromise<DocMd> {
	if (IS_PREVIEW) {
		return downloadDocLatestRevisionMarkdown(docID);
	}

	return downloadDocLatestDeployRevisionMarkdown(docID);
}

// TODO: Change function name to the const above
export const downloadDocLatestRevisionMarkdown = downloadDocLatestMarkdownRevision;
export async function downloadDocLatestMarkdownRevision(docID: DocID): ErrorReturnPromise<DocMd> {
	const [revisions, errorGetRevisions] = await getDocRevisions(defaultGoogleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestRevision, errorGetLatestRevision] = getLatestRevision(revisions);
	if (errorGetLatestRevision !== null) {
		return [null, errorGetLatestRevision];
	}

	return downloadDocMarkdownRevision(defaultGoogleAuth, docID, latestRevision.revisionID);
}

// TODO: Change function name to the const above
export const downloadDocLatestDeployRevisionMarkdown = downloadDocLatestMarkdownDeployRevision;
export async function downloadDocLatestMarkdownDeployRevision(docID: DocID): ErrorReturnPromise<DocMd> {
	const [revisions, errorGetRevisions] = await getDocRevisions(defaultGoogleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestDeployRevision, errorGetLatestDeployRevision] = getLatestDeployRevision(revisions);
	if (errorGetLatestDeployRevision !== null) {
		return [null, errorGetLatestDeployRevision];
	}

	return downloadDocMarkdownRevision(defaultGoogleAuth, docID, latestDeployRevision.revisionID);
}

export async function downloadDocLatestRevision(docID: DocID): ErrorReturnPromise<Doc> {
	const [revisions, errorGetRevisions] = await getDocRevisions(defaultGoogleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestRevision, errorGetLatestRevision] = getLatestRevision(revisions);
	if (errorGetLatestRevision !== null) {
		return [null, errorGetLatestRevision];
	}

	return downloadDocRevision(defaultGoogleAuth, docID, latestRevision.revisionID);
}

export async function downloadDocLatestDeployRevision(docID: DocID): ErrorReturnPromise<Doc> {
	const [revisions, errorGetRevisions] = await getDocRevisions(defaultGoogleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestDeployRevision, errorGetLatestDeployRevision] = getLatestDeployRevision(revisions);
	if (errorGetLatestDeployRevision !== null) {
		return [null, errorGetLatestDeployRevision];
	}

	return downloadDocRevision(defaultGoogleAuth, docID, latestDeployRevision.revisionID);
}

export function downloadSpreadsheetCorrectRevision(spreadsheetID: SpreadsheetID): ErrorReturnPromise<Spreadsheet> {
	if (IS_PREVIEW) {
		return downloadSpreadsheetLatestRevision(spreadsheetID);
	}

	return downloadSpreadsheetLatestDeployRevision(spreadsheetID);
}

export async function downloadSpreadsheetLatestRevision(spreadsheetID: SpreadsheetID): ErrorReturnPromise<Spreadsheet> {
	const [revisions, errorGetRevisions] = await getSheetRevisions(defaultGoogleAuth, spreadsheetID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestRevision, errorLatestRevision] = getLatestRevision(revisions);
	if (errorLatestRevision !== null) {
		return [null, errorLatestRevision];
	}

	return downloadSpreadsheetRevision(defaultGoogleAuth, spreadsheetID, latestRevision.revisionID);
}

export async function downloadSpreadsheetLatestDeployRevision(spreadsheetID: SpreadsheetID): ErrorReturnPromise<Spreadsheet> {
	const [revisions, errorGetRevisions] = await getSheetRevisions(defaultGoogleAuth, spreadsheetID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestDeployRevision, errorGetLatestDeployRevision] = getLatestDeployRevision(revisions);
	if (errorGetLatestDeployRevision !== null) {
		return [null, errorGetLatestDeployRevision];
	}

	return downloadSpreadsheetRevision(defaultGoogleAuth, spreadsheetID, latestDeployRevision.revisionID);
}

export function simpleFileUpload(folderID: FolderID, file: File): ErrorReturnPromise<FileID> {
	return internalSimpleFileUpload(defaultGoogleAuth, folderID, file);
}

export function createFolder(parentFolderID: FolderID, folderName: string): ErrorReturnPromise<FolderID> {
	return internalCreateFolder(defaultGoogleAuth, parentFolderID, folderName);
}

export function copyPermissions(sourceResourceID: ResourceID, targetResourceID: ResourceID): Promise<Error | null> {
	return internalCopyPermissions(defaultGoogleAuth, sourceResourceID, targetResourceID);
}

export function clearAllPermissions(targetResourceID: ResourceID, except?: EmailAddress[]): Promise<Error | null> {
	return internalClearAllPermissions(defaultGoogleAuth, targetResourceID, except);
}

export function addPermission(
	targetResourceID: ResourceID,
	emailAddress: EmailAddress,
	permissionRole: PermissionRole,
	permissionType: PermissionType = "user",
): Promise<Error | null> {
	return internalAddPermission(defaultGoogleAuth, targetResourceID, emailAddress, permissionRole, permissionType);
}

export function getFolderIDorCreateIfNotExistent(parentFolderID: FolderID, folderName: string): ErrorReturnPromise<GetFolderIDorCreateIfNotExistentReturn> {
	return internalGetFolderIDorCreateIfNotExistent(defaultGoogleAuth, parentFolderID, folderName);
}
