import type { ErrorReturn } from 'cstd-ts/error/index.js';

export interface HeadingProviderProps {
	getHeadingNumber: () => number;
}

export function headingNumbersProvider(sectionsCombinedArray): ErrorReturn<{}> {
	const sortedSections = sectionsCombinedArray
		.map(({ component, ds }) => ({ component, ds, order: ds.dataUsed.metadata.orderNumberDS }))
		.sort((a, b) => a.order - b.order);

	const newSectionsCombinedArray: Record<string, any> = [];

	let runningHeadingNumber = 1;
	for (const section of sortedSections) {
		const getHeadingNumberFunction = () => {
			const currentHeadingNumber = runningHeadingNumber;
			runningHeadingNumber += 1;
			return currentHeadingNumber;
		};

		const newComponent = (props) => section.component({ ...props, getHeadingNumberFunction });

		newSectionsCombinedArray.push({
			ds: section.ds,
			component: newComponent,
		});
	}

	return [newSectionsCombinedArray, null];
}
