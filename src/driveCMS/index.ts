// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { IS_PREVIEW } from '@/const.js';
import { type ErrorReturnPromise, safe } from '@/error';
import { google } from 'googleapis';
import { type Doc, type DocID, type DocMd, downloadDocMarkdownRevision, downloadDocRevision, getDocRevisions } from './docs.js';
import {
	type FileID,
	type FolderID,
	type PermissionRole,
	type PermissionType,
	getLatestDeployRevision,
	getLatestRevision,
	internalListFolderPersistantCached,
	internalUNSAFEChangePermissionsToAnyoneWithLinkReader,
} from './drive.js';
import {
	addPermission as internalAddPermission,
	clearAllPermissions as internalClearAllPermissions,
	copyPermissions as internalCopyPermissions,
	createFolder as internalCreateFolder,
	simpleFileUpload as internalSimpleFileUpload,
} from './drive.js';
import { type FileUploadOptions, type Form, type FormID, getForm as internalGetForm } from './form.js';
import type { Resource, ResourceID } from './resource.js';
import { type Spreadsheet, type SpreadsheetID, downloadSpreadsheetRevision, getSheetRevisions } from './spreadsheet.js';

if (typeof process.env['CORIODERS_DRIVE_CMS_KEY'] !== 'string') {
	throw new Error(
		'Unable to initialize drive cms, missing the `CORIODERS_DRIVE_CMS_KEY` environment variable. See https://medium.com/@matheodaly.md/using-google-drive-api-with-python-and-a-service-account-d6ae1f6456c2',
	);
}

export type EmailAddress = string & { readonly __emailAddressTag: unique symbol };

const [driveCMSJsonKey, driveCMSJsonKeyError] = safe(() => JSON.parse(process.env['CORIODERS_DRIVE_CMS_KEY'] as string));
if (driveCMSJsonKeyError) {
	throw new Error(`Unable to initialize drive cms, CORIODERS_DRIVE_CMS_KEY is not a valid JSON: ${driveCMSJsonKeyError.message}`, { cause: driveCMSJsonKeyError });
}

export const SERVICE_ACCOUNT_EMAIL = driveCMSJsonKey.client_email as EmailAddress;

// to make this work you have to enable
// Google Drive API
// Google Drive Activity API
const googleAuth = new google.auth.GoogleAuth({
	credentials: driveCMSJsonKey,
	scopes: ['https://www.googleapis.com/auth/drive'],
});

export async function getRequestAuthHeaders(url: string): Promise<{ [index: string]: string }> {
	return await googleAuth.getRequestHeaders(url);
}

export function getForm(formID: FormID, isPreview: boolean, fileUploadOptions?: FileUploadOptions): ErrorReturnPromise<Form> {
	return internalGetForm(googleAuth, formID, isPreview, fileUploadOptions);
}

// const driveAPI = google.drive({ version: "v3", auth: googleAuth });
// const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

// Figure out if changing permissions of the folder would work.
export function UNSAFEChangePermissionsToAnyoneWithLinkReader(fileID: FileID): ErrorReturnPromise<void, Error | null> {
	return internalUNSAFEChangePermissionsToAnyoneWithLinkReader(googleAuth, fileID);
}

export function listFolder(folderID: FolderID): ErrorReturnPromise<Resource[]> {
	return internalListFolderPersistantCached(googleAuth, folderID);
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
	const [revisions, errorGetRevisions] = await getDocRevisions(googleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestRevision, errorGetLatestRevision] = getLatestRevision(revisions);
	if (errorGetLatestRevision !== null) {
		return [null, errorGetLatestRevision];
	}

	return downloadDocMarkdownRevision(googleAuth, docID, latestRevision.revisionID);
}

// TODO: Change function name to the const above
export const downloadDocLatestDeployRevisionMarkdown = downloadDocLatestMarkdownDeployRevision;
export async function downloadDocLatestMarkdownDeployRevision(docID: DocID): ErrorReturnPromise<DocMd> {
	const [revisions, errorGetRevisions] = await getDocRevisions(googleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestDeployRevision, errorGetLatestDeployRevision] = getLatestDeployRevision(revisions);
	if (errorGetLatestDeployRevision !== null) {
		return [null, errorGetLatestDeployRevision];
	}

	return downloadDocMarkdownRevision(googleAuth, docID, latestDeployRevision.revisionID);
}

export async function downloadDocLatestRevision(docID: DocID): ErrorReturnPromise<Doc> {
	const [revisions, errorGetRevisions] = await getDocRevisions(googleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestRevision, errorGetLatestRevision] = getLatestRevision(revisions);
	if (errorGetLatestRevision !== null) {
		return [null, errorGetLatestRevision];
	}

	return downloadDocRevision(googleAuth, docID, latestRevision.revisionID);
}

export async function downloadDocLatestDeployRevision(docID: DocID): ErrorReturnPromise<Doc> {
	const [revisions, errorGetRevisions] = await getDocRevisions(googleAuth, docID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestDeployRevision, errorGetLatestDeployRevision] = getLatestDeployRevision(revisions);
	if (errorGetLatestDeployRevision !== null) {
		return [null, errorGetLatestDeployRevision];
	}

	return downloadDocRevision(googleAuth, docID, latestDeployRevision.revisionID);
}

export async function downloadSpreadsheetLatestRevision(spreadsheetID: SpreadsheetID): ErrorReturnPromise<Spreadsheet> {
	const [revisions, errorGetRevisions] = await getSheetRevisions(googleAuth, spreadsheetID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestRevision, errorLatestRevision] = getLatestRevision(revisions);
	if (errorLatestRevision !== null) {
		return [null, errorLatestRevision];
	}

	return downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestRevision.revisionID);
}

export async function downloadSpreadsheetLatestDeployRevision(spreadsheetID: SpreadsheetID): ErrorReturnPromise<Spreadsheet> {
	const [revisions, errorGetRevisions] = await getSheetRevisions(googleAuth, spreadsheetID);
	if (errorGetRevisions !== null) {
		return [null, errorGetRevisions];
	}

	const [latestDeployRevision, errorGetLatestDeployRevision] = getLatestDeployRevision(revisions);
	if (errorGetLatestDeployRevision !== null) {
		return [null, errorGetLatestDeployRevision];
	}

	return downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestDeployRevision.revisionID);
}

export function simpleFileUpload(folderID: FolderID, file: File): ErrorReturnPromise<FileID> {
	return internalSimpleFileUpload(googleAuth, folderID, file);
}

export function createFolder(parentFolderID: FolderID, folderName: string): ErrorReturnPromise<FolderID> {
	return internalCreateFolder(googleAuth, parentFolderID, folderName);
}

export function copyPermissions(sourceResourceID: ResourceID, targetResourceID: ResourceID): Promise<Error | null> {
	return internalCopyPermissions(googleAuth, sourceResourceID, targetResourceID);
}

export function clearAllPermissions(targetResourceID: ResourceID, except?: EmailAddress[]): Promise<Error | null> {
	return internalClearAllPermissions(googleAuth, targetResourceID, except);
}

export function addPermission(
	targetResourceID: ResourceID,
	emailAddress: EmailAddress,
	permissionRole: PermissionRole,
	permissionType: PermissionType = 'user',
): Promise<Error | null> {
	return internalAddPermission(googleAuth, targetResourceID, emailAddress, permissionRole, permissionType);
}
