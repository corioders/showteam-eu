import type { DataSchema, DataSchemaDefinition } from 'cstd-ts/dataSchema/index.js';
import type { ErrorReturn } from 'cstd-ts/error/index.js';
import type { ReactNode } from 'react';

type SectionsDSToSectionsComponentsObject<SectionDS extends DataSchema<any>> = {
	[K in keyof SectionDS]: (props: SectionDS[K]) => ReactNode;
};

export function renderSections<
	SectionsDSD extends DataSchemaDefinition<SectionsDSD, any>,
	SectionsDS extends DataSchema<SectionsDSD>,
	SectionsCO extends SectionsDSToSectionsComponentsObject<SectionsDS>,
>(sectionsDS: SectionsDS, sectionsCO: SectionsCO, providers): ErrorReturn<ReactNode[]> {
	const sectionsCombinedArray = Object.entries(sectionsDS).map(([sectionName, sectionDS]) => ({ ds: sectionDS, component: sectionsCO[sectionName] }));
	console.log(sectionsCombinedArray);

	let runningSectionsCombinedArray = sectionsCombinedArray;
	for (const provider of providers) {
		let providerError: Error;
		[runningSectionsCombinedArray, providerError] = provider(sectionsCombinedArray);
		if (providerError) {
			return [null, providerError];
		}
	}

	const sectionComponents = [];
	for (const section of runningSectionsCombinedArray) {
		const newComponent = (props) => section.component({ ...props, data: section.ds });
		sectionComponents.push(newComponent);
	}

	return [sectionComponents, null];
}
