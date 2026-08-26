import type { FileID } from "cstd-ts/driveCMS/drive.js";
import { internalEdgeSimpleFileUploadGetAuthorizedUploadURL } from "cstd-ts/driveCMS/file-upload/edge-simple-file-upload.js";
import type { MIMETypeTE } from "cstd-ts/driveCMS/resource.js";
import { safe, safePromise } from "cstd-ts/error/index.js";
import { StatusCodes } from "http-status-codes";

import { type FileUploadRequestFormData, getFromFormData } from "./index.js";

// YOU CANNOT SET THIS AS EXPORT FOR YOUR ROUTE. IT MUST BE HARD CODED, JUST COPY-PASE THIS LINE
export const dynamic = "force-dynamic";
// YOU CANNOT SET THIS AS EXPORT FOR YOUR ROUTE. IT MUST BE HARD CODED, JUST COPY-PASE THIS LINE
export const runtime = "edge";

// function corsHeaders(req: Request) {
// 	const origin = req.headers.get("origin") ?? "*";
// 	return {
// 		"Access-Control-Allow-Headers": "Content-Type, Authorization",
// 		"Access-Control-Allow-Methods": "POST, OPTIONS",
// 		"Access-Control-Allow-Origin": origin,
// 		"Access-Control-Max-Age": "86400",
// 	};
// }

// export async function OPTIONS(req: Request) {
// 	return new Response(null, { headers: corsHeaders(req), status: 204 });
// }

const MULTIPLAYER = 1024;

const BYTE = 1;
const KILOBYTE = MULTIPLAYER * BYTE;
const MEGABYTE = MULTIPLAYER * KILOBYTE;
// const GIGABYTE = MULTIPLAYER * MEGABYTE;

const MAX_STRING_LENGTH = KILOBYTE;

const MAX_FILE_LENGTH = 100 * MEGABYTE;

export async function POST(req: Request) {
	const contentType = req.headers.get("content-type") ?? "";
	if (!contentType.includes("multipart/form-data")) {
		console.log(`invalid content type ${contentType}`);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [fileUploadRequestFromData, errorfileUploadRequest] = await safePromise<FileUploadRequestFormData>(() => req.formData() as Promise<FileUploadRequestFormData>);
	if (errorfileUploadRequest) {
		console.log(errorfileUploadRequest);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const fileUploadFile = getFromFormData(fileUploadRequestFromData, "f");
	if (fileUploadFile.name.length > MAX_STRING_LENGTH) {
		console.log("fileUploadFile.name.length > MAX_STRING_LENGTH");
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	if (fileUploadFile.type.length > MAX_STRING_LENGTH) {
		console.log("fileUploadFile.type.length > MAX_STRING_LENGTH");
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	if (fileUploadFile.size > MAX_FILE_LENGTH) {
		console.log("fileUploadFile.type.length > MAX_STRING_LENGTH");
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [fileArrayBuffer, errorFileArrayBuffer] = await safePromise(() => fileUploadFile.arrayBuffer());
	if (errorFileArrayBuffer) {
		console.log(`errorFileArrayBuffer ${errorFileArrayBuffer}`);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}
	if (fileArrayBuffer.byteLength > MAX_FILE_LENGTH) {
		console.log("fileArrayBuffer.byteLength > MAX_FILE_LENGTH");
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [fileBuffer, errorFileBuffer] = safe(() => Buffer.from(fileArrayBuffer));
	if (errorFileBuffer) {
		console.log(`errorFileBuffer ${errorFileBuffer}`);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const fileUploadParentFolderID = getFromFormData(fileUploadRequestFromData, "p");

	if (fileUploadParentFolderID.length > MAX_STRING_LENGTH) {
		console.log(`fileUploadParentFolderID.length > MAX_STRING_LENGTH ${MAX_STRING_LENGTH}`);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [authorizedUploadURL, errorGetAuthorizedURL] = await internalEdgeSimpleFileUploadGetAuthorizedUploadURL({
		mimeType: fileUploadFile.type as MIMETypeTE,
		name: fileUploadFile.name,
		parents: [fileUploadParentFolderID],
	});
	if (errorGetAuthorizedURL !== null) {
		console.log("errorGetAuthorizedURL", errorGetAuthorizedURL);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [uploadResponse, uploadError] = await safePromise(() =>
		fetch(authorizedUploadURL, {
			body: fileBuffer,
			method: "PUT",
		}),
	);
	if (uploadError) {
		console.log(`Error while uploading: ${uploadError}`);
		return new Response(`Error while uploading: ${uploadError}`, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	if (!uploadResponse.ok) {
		console.log(`!uploadResponse.ok ${uploadResponse.status} ${uploadResponse.statusText}`);
		return new Response(uploadResponse.statusText, { status: uploadResponse.status });
	}

	interface UploadGoogleResponse {
		id?: FileID;
	}

	const [uploadResponseJson, errorUploadResponseJson] = await safePromise<UploadGoogleResponse>(() => uploadResponse.json());
	if (errorUploadResponseJson) {
		return new Response(`Error while uploading: ${errorUploadResponseJson}`, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const uploadedFileID = uploadResponseJson.id;
	if (!uploadedFileID) {
		return new Response("Error while uploading.", { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	return new Response(uploadedFileID, { status: StatusCodes.OK });
}
