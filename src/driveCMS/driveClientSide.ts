// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import type { FileID } from './drive.js';

export function fileIDToGoogleDriveLink(fileID: FileID): string {
	return `https://drive.google.com/file/d/${fileID}/view`;
}
