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

// import { parse as csvParse } from "csv/sync";

// export interface SpreadsheetCSVData {
//   sheets: Record<SheetTitle, SheetCSVData>;
// }

// export async function downloadSpreadsheetAsCSV(
//   googleAuth: GoogleAuth,
//   spreadsheetId: string
// ): Promise<SpreadsheetCSVData> {
//   const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

//   // Get ID's of individual sheets.
//   const spreadsheetsGetResponse = await sheetsAPI.spreadsheets.get({ spreadsheetId: spreadsheetId });
//   const spreadsheetsGetData = spreadsheetsGetResponse.data;
//   const sheetsMetadata = spreadsheetsGetData.sheets;
//   if (sheetsMetadata === undefined) {
//     throw "";
//   }

//   const sheetsIDs: SheetID[] = [];
//   const sheetsTitles: SheetTitle[] = [];
//   for (const sheetMetadata of sheetsMetadata) {
//     if (sheetMetadata.properties === undefined) {
//       throw "";
//     }

//     if (typeof sheetMetadata.properties.sheetId !== "number") {
//       throw "";
//     }

//     if (typeof sheetMetadata.properties.title !== "string") {
//       throw "";
//     }

//     sheetsIDs.push(sheetMetadata.properties.sheetId as SheetID);
//     sheetsTitles.push(sheetMetadata.properties.title as SheetTitle);
//   }

//   const downloadPromises = sheetsIDs.map((sheetID) => downloadSheetAsCSV(googleAuth, spreadsheetId, sheetID));
//   const downloadedSheets = await Promise.all(downloadPromises);

//   const spreadsheet: SpreadsheetCSVData = { sheets: {} };
//   for (let i = 0; i < downloadedSheets.length; i++) {
//     spreadsheet.sheets[sheetsTitles[i]] = downloadedSheets[i];
//   }

//   return spreadsheet;
// }

// export interface SheetCSVData {
//   data: Array<unknown>;
// }
// export type SheetTitle = string & { readonly "": unique symbol };
// export type SheetID = number & { readonly "": unique symbol };

// export async function downloadSheetAsCSV(
//   googleAuth: GoogleAuth,
//   spreadsheetId: string,
//   sheetID: SheetID
// ): Promise<SheetCSVData> {
//   // This call is reverse engineered by observing the google sheet network tab.
//   const response: GaxiosResponse<string> = await createAPIRequest({
//     options: {
//       url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&id=${spreadsheetId}&gid=${sheetID}`,
//       method: "GET",
//     },
//     params: {},
//     requiredParams: [],
//     pathParams: [],
//     context: { _options: { auth: googleAuth } },
//   });

//   const csvData = csvParse(response.data);

//   return {
//     data: csvData,
//   };
// }
