// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import { type ErrorReturnPromise, safePromise } from "@/error/index.js";
import type { ImageURL } from "@/media/image/index.js";
import type { ValueOf } from "@/type/index.js";

import type { FileID, FolderID } from "./drive.js";
import { fileIDToGoogleDriveLink, type GoogleDriveFileURL } from "./drive-client-side.js";

export type FormQuestionTypeValue = ValueOf<FormQuestionType>;
export type FormQuestionType = typeof FORM_QUESTION_TYPE;

// biome-ignore assist/source/useSortedKeys: We want to follow ordering from the googleAPIsItemToFormQuestion function
export const FORM_QUESTION_TYPE = {
	checkbox: "checkbox",
	dropdown: "dropdown",
	radio: "radio",
	scale: "scale",
	text: "text",
	textarea: "textarea",
	file: "file",
} as const;

export interface FormImage {
	url: ImageURL;
	width: number;
}

export interface FormQuestion {
	type: FormQuestionTypeValue;
	title: string;
	required: boolean;
	questionNameAttributeID: string;

	description?: string;
	image?: FormImage;
}

export interface FormQuestionOptionImage {
	value: string;
	image?: FormImage;
}

export interface FormQuestionCheckbox extends FormQuestion {
	type: FormQuestionType["checkbox"];
	hasImageInOptions: boolean;
	options: FormQuestionOptionImage[];
}

export function isFormQuestionCheckbox(q: FormQuestion): q is FormQuestionCheckbox {
	return q.type === FORM_QUESTION_TYPE.checkbox;
}

export interface FormQuestionDropdown extends FormQuestion {
	type: FormQuestionType["dropdown"];
	options: string[];
}

export function isFormQuestionDropdown(q: FormQuestion): q is FormQuestionDropdown {
	return q.type === FORM_QUESTION_TYPE.dropdown;
}

export interface FormQuestionRadio extends FormQuestion {
	type: FormQuestionType["radio"];
	hasImageInOptions: boolean;
	options: FormQuestionOptionImage[];
}

export function isFormQuestionRadio(q: FormQuestion): q is FormQuestionRadio {
	return q.type === FORM_QUESTION_TYPE.radio;
}

export interface FormQuestionScale extends FormQuestion {
	type: FormQuestionType["scale"];
	max: number;
	min: number;

	maxLabel?: string;
	minLabel?: string;
}

export function isFormQuestionScale(q: FormQuestion): q is FormQuestionScale {
	return q.type === FORM_QUESTION_TYPE.scale;
}

export interface FormQuestionTextarea extends FormQuestion {
	type: FormQuestionType["textarea"];
}

export function isFormQuestionTextarea(q: FormQuestion): q is FormQuestionTextarea {
	return q.type === FORM_QUESTION_TYPE.textarea;
}

export interface FormQuestionText extends FormQuestion {
	type: FormQuestionType["text"];
}

export function isFormQuestionText(q: FormQuestion): q is FormQuestionText {
	return q.type === FORM_QUESTION_TYPE.text;
}

export interface FormQuestionFile extends FormQuestion {
	type: FormQuestionType["file"];
}

export interface InternalFormQuestionFile extends FormQuestionFile {
	internalUploadFolderID: FolderID;
}

export function isFormQuestionFile(q: FormQuestion): q is FormQuestionFile {
	return q.type === FORM_QUESTION_TYPE.file;
}

export interface FormSection {
	title: string;
	description?: string;

	questions: FormQuestion[];
}

export interface Form {
	sections: FormSection[];
	responsePostURL: string;
	fileUploadEnabled?: boolean;
}

export type FileUploadIDToFolderID = Record<string, FolderID | undefined>;
export interface FormSmallClientSideFileUploadOptions {
	fileUploadIDToFolderID: FileUploadIDToFolderID;
}

export type PerSectionQuestionIDs = string[][];

export interface FormSmallClientSide {
	perSectionQuestionIDs: PerSectionQuestionIDs;
	responsePostURL: string;

	fileUpload?: FormSmallClientSideFileUploadOptions;
}

const FILE_UPLOAD_QUESTION_PREFIX = "FileUpload:::";
export function isFileUploadQuestion(title: string): boolean {
	return title.startsWith(FILE_UPLOAD_QUESTION_PREFIX);
}

export function getFileUploadQuestionTitle(title: string): string {
	return title.replace(FILE_UPLOAD_QUESTION_PREFIX, "").trim();
}

function getCoriodersFormUploadWorkerUploadPath(coriodersFormUploadWorkerURL: string, targetFolderID: FolderID) {
	return `${coriodersFormUploadWorkerURL}/upload/${targetFolderID}`;
}

export async function uploadFileUsingForm(file: File, uploadFolderID: FolderID): ErrorReturnPromise<GoogleDriveFileURL> {
	const uploadURL = getCoriodersFormUploadWorkerUploadPath(process.env["NEXT_PUBLIC_CORIODERS_FORM_UPLOAD_WORKER_URL"] as string, uploadFolderID);

	const formUploadWorkerForm = new FormData();
	formUploadWorkerForm.append("file", file);

	const [formUploadWorkerResponse, formUploadWorkerResponseError] = await safePromise(() =>
		fetch(uploadURL, {
			body: formUploadWorkerForm,
			method: "POST",
			mode: "cors",
		}),
	);
	if (formUploadWorkerResponseError) {
		return [null, formUploadWorkerResponseError];
	}
	if (!formUploadWorkerResponse.ok) {
		return [null, new Error(`Error while uploading file: ${formUploadWorkerResponse.statusText}`)];
	}

	const formUploadWorkerResponseText = await formUploadWorkerResponse.text();
	const uploadedFileID = formUploadWorkerResponseText as FileID;

	return [fileIDToGoogleDriveLink(uploadedFileID), null];
}
