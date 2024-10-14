// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { createAPIRequest, GaxiosResponse, GoogleAuth } from "googleapis-common";
import { ValueOf } from "@/type";

export type FileID = string & { readonly "": unique symbol };
export type RevisionID = number & { readonly "": unique symbol };

// https://developers.google.com/drive/api/guides/ref-export-formats
export type MIME_TYPE_T = ValueOf<typeof MIME_TYPE>;
export const MIME_TYPE = {
  csv: "text/csv",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

// TODO: Check if all responses succeeded
// TODO: Handle the edge case when fileID is actually a folderID. Example: 1W9Ubb6l8zWUEMhmyGaI8K6H7eDQHMOkJ
export async function downloadFileRevision(
  googleAuth: GoogleAuth,
  fileID: FileID,
  revisionID?: RevisionID,
  mimeType?: MIME_TYPE_T
): Promise<unknown> {
  // https://developers.google.com/drive/api/reference/rest/v3/operations#Operation
  interface Operation {
    response: {
      downloadUri: string;
    };
  }

  const downloadURIResponse: GaxiosResponse<Operation> = await createAPIRequest({
    options: {
      url: `https://www.googleapis.com/drive/v3/files/${fileID}/download`,
      method: "POST",
    },
    params: {
      revisionId: revisionID,
      mimeType: mimeType,
    },
    requiredParams: [],
    pathParams: [],
    context: { _options: { auth: googleAuth } },
  });

  const downloadURL = downloadURIResponse.data.response.downloadUri;
  const downloadResponse = await createAPIRequest({
    options: {
      url: downloadURL,
      method: "GET",
    },
    params: {},
    requiredParams: [],
    pathParams: [],
    context: { _options: { auth: googleAuth } },
  });

  return downloadResponse.data;
}
