// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { Workbook } from "exceljs";
import type { GoogleAuth } from "googleapis-common";

import { type ErrorReturnPromise, safePromise } from "@/error";

import { memoizeDriveCMS } from "./cache.js";
import { downloadFile, type FileID, getRevisionsFromUndocumentedAPIPersistentCached, type Revision, type RevisionID } from "./drive.js";
import { MIMEType, type MIMETypeT, type Resource } from "./resource.js";

export type SpreadsheetID = FileID & { readonly __spreadsheetTag: unique symbol };

export interface Spreadsheet {
	spreadsheetID: SpreadsheetID;

	workbook: Workbook;
}

export interface SpreadsheetResource extends Resource {
	id: SpreadsheetID;
	mimeType: MIMETypeT["spreadsheet"];
}

export function isSpreadsheet(resource: Resource): resource is SpreadsheetResource {
	return resource.mimeType === MIMEType.spreadsheet;
}

// TODO: CACHE
export const downloadSpreadsheetRevision = memoizeDriveCMS(async function downloadSpreadsheetRevision(
	googleAuth: GoogleAuth,
	spreadsheetID: SpreadsheetID,
	revisionID: RevisionID,
): ErrorReturnPromise<Spreadsheet> {
	const [spreadsheetAsExcel, errorDownloadFile] = await downloadFile(googleAuth, spreadsheetID, revisionID, MIMEType.excel);
	if (errorDownloadFile !== null) {
		return [null, errorDownloadFile];
	}

	const spreadsheetAsExcelBlob = spreadsheetAsExcel as Blob;
	const [excelFile, errorArrayBuffer] = await safePromise(() => spreadsheetAsExcelBlob.arrayBuffer());
	if (errorArrayBuffer !== null) {
		return [null, errorArrayBuffer];
	}

	const workbook = new Workbook();
	const [_, errorWorkbookLoad] = await safePromise(() => workbook.xlsx.load(Buffer.from(excelFile) as never));
	if (errorWorkbookLoad !== null) {
		return [null, errorWorkbookLoad];
	}

	const spreadsheet = {
		spreadsheetID: spreadsheetID,

		workbook: workbook,
	};

	return [spreadsheet, null];
});

export const getSheetRevisions = memoizeDriveCMS(async function getSheetRevisions(googleAuth: GoogleAuth, spreadsheetId: SpreadsheetID): ErrorReturnPromise<Revision[]> {
	const [revisions, err] = await getRevisionsFromUndocumentedAPIPersistentCached(
		googleAuth,
		`https://docs.google.com/spreadsheets/d/${spreadsheetId}/revisions/tiles?id=${spreadsheetId}&start=1&revisionBatchSize=1500&showDetailedRevisions=false&loadType=0&includes_info_params=true&cros_files=false`,
	);
	if (err !== null) {
		return [null, err];
	}

	return [revisions, null];
});
