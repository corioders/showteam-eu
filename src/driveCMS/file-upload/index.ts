import type { FileID, FolderID } from "cstd-ts/driveCMS/drive.js";

interface FileUploadRequestFormDataInterface {
	// file to upload
	f: File;
	// parent folder id
	p: FolderID;
}

type FileUploadRequestFormDataKeys = keyof FileUploadRequestFormDataInterface;

export type FileUploadRequestFormData = FormData & { readonly __fileUploadRequestFormDataTag: unique symbol };

export function appendToFormData<Key extends FileUploadRequestFormDataKeys, Value extends FileUploadRequestFormDataInterface[Key]>(
	formData: FileUploadRequestFormData,
	key: Key,
	value: Value,
) {
	formData.append(key, value);
}

export function getFromFormData<Key extends FileUploadRequestFormDataKeys, Value extends FileUploadRequestFormDataInterface[Key]>(
	formData: FileUploadRequestFormData,
	key: Key,
): Value {
	return formData.get(key) as Value;
}

// The uploaded file id
export type FileUploadResponse = FileID;
