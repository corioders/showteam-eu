// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import type { ErrorReturnPromise } from '@/error';
import { google } from 'googleapis';
import { type Doc, type DocID, DocMd, downloadDocMarkdownRevision, downloadDocRevision, getDocRevisions } from './docs';
import {
	type FileID,
	type FolderID,
	type Resource,
	getLatestDeployRevision,
	getLatestRevision,
	internalListFolder,
	internalUNSAFEChangePermissionsToAnyoneWithLinkReader,
} from './drive';
import { type Spreadsheet, type SpreadsheetID, downloadSpreadsheetRevision, getSheetRevisions } from './spreadsheet';

if (typeof process.env.CORIODERS_DRIVE_CMS_KEY !== 'string') {
	throw new Error(
		'Unable to initialize drive cms, missing the `CORIODERS_DRIVE_CMS_KEY` environment variable. See https://medium.com/@matheodaly.md/using-google-drive-api-with-python-and-a-service-account-d6ae1f6456c2',
	);
}

const googleAuth = new google.auth.GoogleAuth({
	credentials: JSON.parse(process.env.CORIODERS_DRIVE_CMS_KEY as string),
	scopes: ['https://www.googleapis.com/auth/drive'],
});

// const driveAPI = google.drive({ version: "v3", auth: googleAuth });
// const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

// Figure out if changing permissions of the folder would work.
export function UNSAFEChangePermissionsToAnyoneWithLinkReader(fileID: FileID): ErrorReturnPromise<void> {
	return internalUNSAFEChangePermissionsToAnyoneWithLinkReader(googleAuth, fileID);
}

export function listFolder(folderID: FolderID): ErrorReturnPromise<Resource[]> {
	return internalListFolder(googleAuth, folderID);
}

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
