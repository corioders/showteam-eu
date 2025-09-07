import type { FolderID } from "cstd-ts/driveCMS/drive.js";
import { internalEdgeSimpleFileUpload } from "cstd-ts/driveCMS/edge-simple-file-upload.js";
import { parseDriveCMSKeyFromEnv } from "cstd-ts/driveCMS/index.js";
import { safePromise } from "cstd-ts/error/index.js";
import { StatusCodes } from "http-status-codes";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function corsHeaders(req: Request) {
	const origin = req.headers.get("origin") ?? "*";
	return {
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Max-Age": "86400",
	};
}

export async function OPTIONS(req: Request) {
	return new Response(null, { headers: corsHeaders(req), status: 204 });
}

const [googleAuthBadType, errorParse] = parseDriveCMSKeyFromEnv("CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY");
if (errorParse) {
	throw errorParse;
}
const googleAuth = googleAuthBadType;

export async function POST(req: Request) {
	const contentType = req.headers.get("content-type") ?? "";
	if (!contentType.includes("multipart/form-data")) {
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [formData, errorFormData] = await safePromise(() => req.formData());
	if (errorFormData) {
		console.log(errorFormData);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const folderID = formData.get("folderID") as FolderID;
	if (typeof folderID !== "string") {
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const file = formData.get("file") as File;
	if (!(file instanceof File)) {
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	const [uploadedFileID, errorUploadFile] = await internalEdgeSimpleFileUpload(googleAuth, folderID, file);
	if (errorUploadFile !== null) {
		console.log("errorUploadFile", errorUploadFile);
		return new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
	}

	return NextResponse.json({ fileID: uploadedFileID });
}
