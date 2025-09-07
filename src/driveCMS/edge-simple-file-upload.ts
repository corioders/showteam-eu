import { createAPIRequest, type GoogleAuth } from "googleapis-common";

import { type ErrorReturnPromise, safe } from "@/error/index.js";

import type { FileID, FolderID } from "./drive.js";

export async function internalEdgeSimpleFileUpload(googleAuth: GoogleAuth, folderID: FolderID, file: File): ErrorReturnPromise<FileID> {
	// ADAPTED FROM: https://github.com/aynh/cloudflare-gdrive/blob/main/src/gdrive.ts
	const fileArrayBuffer = await file.arrayBuffer();
	const _fileBuffer = Buffer.from(fileArrayBuffer);

	const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
	url.searchParams.append("fields", "id, name, mimeType, size, imageMediaMetadata");
	url.searchParams.append("uploadType", "resumable");
	url.searchParams.append("supportsAllDrives", "true");

	const fileMetadata = {
		mimeType: file.type,
		name: file.name,
		parents: [folderID],
	};

	const initResponse = await createAPIRequest({
		context: { _options: { auth: googleAuth } },
		options: {
			body: JSON.stringify(fileMetadata),
			method: "POST",
			url: url,
		},
		params: {},
		pathParams: [],
		requiredParams: [],
	});

	console.log("mleko");
	console.log(safe(() => JSON.stringify(initResponse.headers)));

	throw new Error(`NOT IMPLEMENTED ${_fileBuffer}`);

	// return ["" as FileID, null];
	// const putUrl = initResponse.headers.location;
	// if (!putUrl) {
	// 	return [null, new Error("Put URL is not defined")];
	// }

	// const response = await fetch(putUrl, {
	// 	body: fileBuffer,
	// 	method: "PUT",
	// });

	// const responseJson = await response.json();
	// const fileID = responseJson.id as FileID;

	// return [fileID, null];
}
