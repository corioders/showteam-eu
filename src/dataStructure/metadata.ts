// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025
export type MetadataBase = Record<string, any>;

export interface ObjectWithMetadata<Metadata extends MetadataBase> {
	metadata: Metadata;
}
