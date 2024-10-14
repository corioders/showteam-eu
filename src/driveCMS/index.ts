// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

// TODO: Make errors handled as in go.

import { google } from "googleapis";
import {
  downloadSpreadsheetRevision,
  getSheetRevisions,
  SheetRevision,
  Spreadsheet,
  SpreadsheetID,
} from "./spreadsheet";
import { SPREADSHEET_DEPLOY_REVISION_NAME } from "./const";

// TODO: make this initialization better.
// TODO: Make sure CORIODERS_DRIVE_CMS_KEY is populated and valid.
const googleAuth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.CORIODERS_DRIVE_CMS_KEY as string),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// const driveAPI = google.drive({ version: "v3", auth: googleAuth });
// const sheetsAPI = google.sheets({ version: "v4", auth: googleAuth });

export async function downloadSpreadsheetLatestRevision(spreadsheetID: SpreadsheetID): Promise<Spreadsheet> {
  const revisions = await getSheetRevisions(googleAuth, spreadsheetID);
  if (revisions.length === 0) {
    throw "revisions.length === 0";
  }

  const latestRevision = revisions[revisions.length - 1];
  return await downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestRevision.revisionID);
}

// TODO: handle when there is no deploy
export async function downloadSpreadsheetLatestDeployRevision(
  spreadsheetID: SpreadsheetID
): Promise<Spreadsheet> {
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
    throw "latestDeployRevision === null";
  }

  return await downloadSpreadsheetRevision(googleAuth, spreadsheetID, latestDeployRevision.revisionID);
}
