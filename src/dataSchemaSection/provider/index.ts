import type { OrderMetadata } from "cstd-ts/dataSchema/metadata/index.js";
import type { ObjectWithMetadata } from "cstd-ts/dataStructure/metadata.js";
import type { EmptyObject } from "cstd-ts/type/index.js";

import { defineSectionProvider, type SectionsCombinedArray } from "../index.js";

export interface HeadingProviderProps {
	getHeadingNumber: () => number;
}

const ERROR_SECTION_ORDER = -100;

export const headingNumbersProvider = defineSectionProvider<ObjectWithMetadata<OrderMetadata>, HeadingProviderProps, EmptyObject>(
	function headingNumbersProvider(sectionsCombinedArray) {
		const sortedSections = sectionsCombinedArray
			.map(({ component, dsn }) => ({ component, dsn, order: dsn.dataUsed?.metadata.orderNumberDS ?? ERROR_SECTION_ORDER }))
			.sort((a, b) => a.order - b.order);

		const newSectionsCombinedArray: SectionsCombinedArray<ObjectWithMetadata<OrderMetadata>, any> = [];
		let runningHeadingNumber = 1;
		for (const section of sortedSections) {
			const getHeadingNumberFunction = () => {
				const currentHeadingNumber = runningHeadingNumber;
				runningHeadingNumber += 1;
				return currentHeadingNumber;
			};

			newSectionsCombinedArray.push({
				component: (props) => section.component({ ...props, getHeadingNumber: getHeadingNumberFunction }),
				dsn: section.dsn,
			});
		}

		return [newSectionsCombinedArray, null];
	},
);

export const sortingProvider = defineSectionProvider<ObjectWithMetadata<OrderMetadata>, EmptyObject, EmptyObject>(function sortingProvider(sectionsCombinedArray) {
	const sortedSections = sectionsCombinedArray
		.map(({ component, dsn }) => ({ component, dsn, order: dsn.dataUsed?.metadata.orderNumberDS ?? ERROR_SECTION_ORDER }))
		.sort((a, b) => a.order - b.order);

	const newSectionsCombinedArray: SectionsCombinedArray<ObjectWithMetadata<OrderMetadata>, any> = [];

	for (const section of sortedSections) {
		newSectionsCombinedArray.push({
			component: (props) => section.component(props),
			dsn: section.dsn,
		});
	}

	return [newSectionsCombinedArray, null];
});
