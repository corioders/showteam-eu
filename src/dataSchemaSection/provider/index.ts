import type { OrderMetadata } from 'cstd-ts/dataSchema/metadata/index.js';
import type { ObjectWithMetadata } from 'cstd-ts/dataStructure/metadata.js';
import type { EmptyObject } from 'cstd-ts/type/index.js';
import { type SectionsCombinedArray, defineSectionProvider } from '../index.js';

export interface HeadingProviderProps {
	getHeadingNumber: () => number;
}

export const headingNumbersProvider = defineSectionProvider<ObjectWithMetadata<OrderMetadata>, HeadingProviderProps, EmptyObject>(
	function headingNumbersProvider(sectionsCombinedArray) {
		const sortedSections = sectionsCombinedArray
			.map(({ component, dsn }) => ({ component, dsn, order: dsn.dataUsed.metadata.orderNumberDS }))
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
				dsn: section.dsn,
				component: (props) => section.component({ ...props, getHeadingNumber: getHeadingNumberFunction }),
			});
		}

		return [newSectionsCombinedArray, null];
	},
);
