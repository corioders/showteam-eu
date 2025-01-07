// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import type { GoogleAuth } from 'googleapis-common';

import { type WorkBook as XlsxWorkBook, read as xlsxRead } from 'xlsx';

import { MIMEType, type ResourceID, type Revision, type RevisionID, downloadFile, getRevisionsFromUndocumentedAPI } from './drive';

export type SpreadsheetID = ResourceID & { readonly __spreadsheetTag: unique symbol };

export interface Spreadsheet {
	workbook: XlsxWorkBook;

	spreadsheetID: SpreadsheetID;
}

export async function downloadSpreadsheetRevision(googleAuth: GoogleAuth, spreadsheetId: SpreadsheetID, revisionID: RevisionID): Promise<Spreadsheet> {
	const spreadsheetAsExcel = await downloadFile(googleAuth, spreadsheetId, revisionID, MIMEType.excel);

	const spreadsheetAsExcelBlob = spreadsheetAsExcel as Blob;
	const excelFile = await spreadsheetAsExcelBlob.arrayBuffer();
	return {
		workbook: xlsxRead(excelFile),

		spreadsheetID: spreadsheetId,
	};
}

// TODO: Corioders errors
export async function getSheetRevisions(googleAuth: GoogleAuth, spreadsheetId: SpreadsheetID): Promise<Revision[]> {
	const [revisions, err] = await getRevisionsFromUndocumentedAPI(
		googleAuth,
		`https://docs.google.com/spreadsheets/d/${spreadsheetId}/revisions/tiles?id=${spreadsheetId}&start=1&revisionBatchSize=1500&showDetailedRevisions=false&loadType=0&includes_info_params=true&cros_files=false`,
	);
	if (err !== null) {
		throw err;
	}

	return revisions;
}
