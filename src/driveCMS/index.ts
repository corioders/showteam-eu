// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

// TODO: Make errors handled as in go.

import { google } from 'googleapis';
import { SPREADSHEET_DEPLOY_REVISION_NAME } from './const';
import {} from './drive';
import { type SheetRevision, type Spreadsheet, type SpreadsheetID, downloadSpreadsheetRevision, getSheetRevisions } from './spreadsheet';

// TODO: make this initialization better.
// TODO: Make sure CORIODERS_DRIVE_CMS_KEY is populated and valid.
const googleAuth = new google.auth.GoogleAuth({
	credentials: JSON.parse(process.env.CORIODERS_DRIVE_CMS_KEY as string),
	scopes: ['https://www.googleapis.com/auth/drive'],
});

// const driveAPI = google.drive({ version: "v3", auth: googleAuth });
// const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

async function main() {
	// const r = await listFolder(googleAuth, '1KlwqTO6etJh4cKd_-uNspzwv0F8o8IKK' as ResourceID);
	// const b = r.filter((r) => r.mimeType.includes('image'));
	// const cc = await getFileDownloadURL(googleAuth, b[0].id);
	// console.log(cc);
	// const a = await fetch(
	// 	'https://drive.google.com/drive-viewer/AKGpiha-SV4pKQ2mYb5Y8b7q-HKzn6SrrQaJ5QeuvNhT8Mx4H9vqYxmIYKmXTXsTS-ljgD_hSJ9XGETyPovbZZHjFq9OZs6kK_qERI4=w2322-h1420-rw-v1',
	// );
	// console.log(a);
}

main();

export async function downloadSpreadsheetLatestRevision(spreadsheetID: SpreadsheetID): Promise<Spreadsheet> {
	const revisions = await getSheetRevisions(googleAuth, spreadsheetID);
	if (revisions.length === 0) {
		throw new Error('revisions.length === 0');
	}

	const latestRevision = revisions[revisions.length - 1];
	return await downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestRevision.revisionID);
}

// TODO: handle when there is no deploy
export async function downloadSpreadsheetLatestDeployRevision(spreadsheetID: SpreadsheetID): Promise<Spreadsheet> {
	const revisions = await getSheetRevisions(googleAuth, spreadsheetID);
	let latestDeployRevision: SheetRevision | null = null;
	for (let i = revisions.length - 1; i >= 0; i--) {
		const revision = revisions[i];
		if (revision.name !== SPREADSHEET_DEPLOY_REVISION_NAME) {
			continue;
		}

		latestDeployRevision = revision;
		break;
	}

	if (latestDeployRevision === null) {
		throw new Error('latestDeployRevision === null');
	}

	return await downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestDeployRevision.revisionID);
}
