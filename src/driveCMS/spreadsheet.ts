// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { createAPIRequest, GaxiosResponse, GoogleAuth } from "googleapis-common";

import { WorkBook as XlsxWorkBook, read as xlsxRead } from "xlsx";

import { downloadFileRevision, FileID, MIME_TYPE, RevisionID } from "./drive";

export type SpreadsheetID = (string & { readonly "": unique symbol }) & FileID;

export interface Spreadsheet {
  workbook: XlsxWorkBook;

  spreadsheetID: SpreadsheetID;
}

export async function downloadSpreadsheetRevision(
  googleAuth: GoogleAuth,
  spreadsheetId: SpreadsheetID,
  revisionID: RevisionID
): Promise<Spreadsheet> {
  const spreadsheetAsExcel = await downloadFileRevision(
    googleAuth,
    spreadsheetId,
    revisionID,
    MIME_TYPE.excel
  );

  const spreadsheetAsExcelBlob = spreadsheetAsExcel as Blob;
  const excelFile = await spreadsheetAsExcelBlob.arrayBuffer();
  return {
    workbook: xlsxRead(excelFile),

    spreadsheetID: spreadsheetId,
  };
}

export interface SheetRevision {
  name?: string;
  revisionID: RevisionID;
}

// TODO: Make sure this function has a file-safe
// TODO: Download ALL revisions: Look at the url: "revisionBatchSize"
export async function getSheetRevisions(
  googleAuth: GoogleAuth,
  spreadsheetId: SpreadsheetID
): Promise<SheetRevision[]> {
  const response: GaxiosResponse<string> = await createAPIRequest({
    options: {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/revisions/tiles?id=${spreadsheetId}&start=1&revisionBatchSize=1500&showDetailedRevisions=false&loadType=0&includes_info_params=true&cros_files=false`,
      method: "GET",
    },
    params: {},
    requiredParams: [],
    pathParams: [],
    context: { _options: { auth: googleAuth } },
  });

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
  const responseJson = JSON.parse(jsonDataString) as ResponseJson;

  const sheetRevisions: SheetRevision[] = [];
  for (const responseRevision of responseJson.tileInfo) {
    sheetRevisions.push({
      revisionID: responseRevision.end as RevisionID,
      name: responseRevision.name,
    });
  }

  return sheetRevisions;
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
