// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

export const DEPLOY_REVISION_NAME = "deploy";

export const GOOGLE_DRIVE_PUBLIC_PREFIX = "PUBLIC";
export function isPublicResource(name: string): boolean {
	return name.startsWith(GOOGLE_DRIVE_PUBLIC_PREFIX);
}
