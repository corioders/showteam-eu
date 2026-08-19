// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import type { ValueOf } from "@/type/index.js";

import type { DocResource } from "./docs.js";
import type { FileResource, FolderResource } from "./drive.js";
import type { FormResource } from "./form.js";
import type { ImageResource } from "./image.js";
import type { SpreadsheetResource } from "./spreadsheet.js";

// https://developers.google.com/drive/api/guides/ref-export-formats
export type MIMETypeT = typeof MIMEType;
// MIMETypeTEnum
export type MIMETypeTE = ValueOf<MIMETypeT>;

export const MIMEType = {
	csv: "text/csv",
	markdown: "text/markdown",

	folder: "application/vnd.google-apps.folder",
	docs: "application/vnd.google-apps.document",
	form: "application/vnd.google-apps.form",
	shortcut: "application/vnd.google-apps.shortcut",
	spreadsheet: "application/vnd.google-apps.spreadsheet",

	excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

	image: "image/*",
} as const;

type MIMETypeMatcherFunction = (mimeType: string) => boolean;
const MIMETypeMatcher: Partial<Record<MIMETypeTE, MIMETypeMatcherFunction>> = {
	[MIMEType.image]: (mimeType: string) => mimeType.startsWith("image/"),
} as const;

export function doesMIMETypeMatch(targetType: MIMETypeTE, x: string): boolean {
	const mathTypeMatcher = MIMETypeMatcher[targetType];
	if (mathTypeMatcher) {
		return mathTypeMatcher(x);
	}

	return targetType === x;
}

// ResourceID is an ID of Folder or File
export type ResourceID = string & { readonly __resourceTag: unique symbol };

export interface Resource {
	id: ResourceID;
	name: string;
	mimeType: MIMETypeTE;
}

/**
 *  @deprecated
 * This is used only in resourceStructureParser
 */
export type MIMETypeToResourceType<T extends MIMETypeTE> = MIMETypeToResourceTypeMapping[T];
type MIMETypeToResourceTypeMapping = {
	[MIMEType.csv]: FileResource;
	[MIMEType.markdown]: FileResource;

	[MIMEType.folder]: FolderResource;
	[MIMEType.docs]: DocResource;
	[MIMEType.form]: FormResource;
	[MIMEType.shortcut]: FileResource;
	[MIMEType.spreadsheet]: SpreadsheetResource;

	[MIMEType.excel]: SpreadsheetResource;
	[MIMEType.docx]: FileResource;

	[MIMEType.image]: ImageResource;
};
