import type { FileID } from './drive.js';

export function fileIDToGoogleDriveLink(fileID: FileID): string {
	return `https://drive.google.com/file/d/${fileID}/view`;
}
