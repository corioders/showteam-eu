import type { FolderID } from "../drive.js";
import type { MIMETypeTE } from "../resource.js";

export interface SimpleUploadFileMetadata {
	mimeType: MIMETypeTE;
	name: string;
	parents: FolderID[];
}

export type GoogleDriveAuthorizedUploadURL = string & { readonly googleDriveAuthorizedUploadURLTag: unique symbol };
