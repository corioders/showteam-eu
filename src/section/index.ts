import type { FunctionComponent } from 'react';

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type SectionsArray<CommonPropsT = {}> = FunctionComponent<CommonPropsT>[];
export function defineSections<const T extends SectionsArray>(sectionArray: T): T {
	return sectionArray;
}
