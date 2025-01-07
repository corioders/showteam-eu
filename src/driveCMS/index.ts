// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { ErrorIs, type ErrorReturnPromise } from '@/error';
import { google } from 'googleapis';
import { type Doc, type DocID, downloadDocRevision, getDocRevisions } from './docs';
import {
	ERR_UNABLE_TO_GET_LATEST_DEPLOY_REVISION,
	type Resource,
	type ResourceID,
	getLatestDeployRevision,
	getLatestRevision,
	listFolder as internalListFolder,
} from './drive';
import { type Spreadsheet, type SpreadsheetID, downloadSpreadsheetRevision, getSheetRevisions } from './spreadsheet';

// TODO: make this initialization better.
// TODO: Make sure CORIODERS_DRIVE_CMS_KEY is populated and valid.
const googleAuth = new google.auth.GoogleAuth({
	credentials: JSON.parse(process.env.CORIODERS_DRIVE_CMS_KEY as string),
	scopes: ['https://www.googleapis.com/auth/drive'],
});

// const driveAPI = google.drive({ version: "v3", auth: googleAuth });
// const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

export function listFolder(folderID: ResourceID): Promise<Resource[]> {
	return internalListFolder(googleAuth, folderID);
}

export async function downloadDocLatestRevision(docID: DocID): ErrorReturnPromise<Doc> {
	const revisions = await getDocRevisions(googleAuth, docID);
	const [latestRevision, err] = getLatestRevision(revisions);
	if (err !== null) {
		throw err;
	}
	return await downloadDocRevision(googleAuth, docID, latestRevision.revisionID);
}

export async function downloadSpreadsheetLatestRevision(spreadsheetID: SpreadsheetID): Promise<Spreadsheet> {
	const revisions = await getSheetRevisions(googleAuth, spreadsheetID);
	const [latestRevision, err] = getLatestRevision(revisions);
	if (err !== null) {
		throw err;
	}

	return await downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestRevision.revisionID);
}

// TODO: handle when there is no deploy
export async function downloadSpreadsheetLatestDeployRevision(spreadsheetID: SpreadsheetID): Promise<Spreadsheet> {
	const revisions = await getSheetRevisions(googleAuth, spreadsheetID);
	const [latestDeployRevision, err] = getLatestDeployRevision(revisions);
	if (err !== null) {
		if (ErrorIs(err, ERR_UNABLE_TO_GET_LATEST_DEPLOY_REVISION)) {
			// TODO: handle when there is no deploy
		}

		throw err;
	}

	return await downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestDeployRevision.revisionID);
}
