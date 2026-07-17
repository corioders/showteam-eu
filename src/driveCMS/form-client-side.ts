// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import type { ImageURL } from "@/media/image/index.js";
import type { ValueOf } from "@/type/index.js";

import type { FolderID } from "./drive.js";

export type FormQuestionTypeValue = ValueOf<FormQuestionType>;
export type FormQuestionType = typeof FORM_QUESTION_TYPE;

export const FORM_QUESTION_TYPE = {
	checkbox: "checkbox",
	dropdown: "dropdown",
	radio: "radio",
	scale: "scale",
	text: "text",
	textarea: "textarea",
	file: "file",
} as const;

export type QuestionNameAttributeID = string & { readonly __tagQuestionNameAttributeID: unique symbol };

export interface FormImage {
	url: ImageURL;
	width: number;
}

export interface OtherOption {
	otherOptionQuestionNameAttributeID: QuestionNameAttributeID;
}
export interface FormQuestion {
	type: FormQuestionTypeValue;
	title: string;
	required: boolean;
	questionNameAttributeID: QuestionNameAttributeID;

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
	otherOption?: OtherOption;
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
	otherOption?: OtherOption;
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
	title?: string;
	description?: string;

	questions: FormQuestion[];
}

export interface Form {
	sections: FormSection[];
	formClientData: FormClientData;
}

export type FileUploadQuestionIDToFolderID = Record<QuestionNameAttributeID, FolderID | undefined>;
export type PerSectionQuestionIDs = QuestionNameAttributeID[][];

export interface FormClientData {
	perSectionQuestionIDs: PerSectionQuestionIDs;
	responsePostURL: string;

	// This is came form testing how google forms behave when multiple sections are involved. When so the client also sends
	// in its formData body a key named pageHistory with "0,1,2,3" if the form has 4 sections. It goes intuitively for any other number
	// of sections.
	pageHistory?: string;

	fileUpload?: FileUploadQuestionIDToFolderID;

	// biome-ignore lint/style/useNamingConvention: TODO
	__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMapping: Record<string, Record<string, string>>;
}

export const OTHER_QUESTION_ID_SUFFIX = ".other_option_response";

const FILE_UPLOAD_QUESTION_PREFIX = "FileUpload:::";
export function isFileUploadQuestion(title: string): boolean {
	return title.startsWith(FILE_UPLOAD_QUESTION_PREFIX);
}

export function getFileUploadQuestionTitle(title: string): string {
	return title.replace(FILE_UPLOAD_QUESTION_PREFIX, "").trim();
}
