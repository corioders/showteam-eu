import { bindComponentProps } from '@/react/bind-props.js';
import type { FunctionComponent } from 'react';
import type { SectionsArray } from './index.js';

export interface HeadingProviderProps {
	getHeadingNumber: () => number;
}

export function provideHeadingNumbers<SectionArrayT extends SectionsArray<HeadingProviderProps>>(sectionArray: SectionArrayT): SectionsArray {
	const components: FunctionComponent[] = [];

	let runningHeadingNumber = 1;
	for (const section of sectionArray) {
		const getHeadingNumberFunction = () => {
			const currentHeadingNumber = runningHeadingNumber;
			runningHeadingNumber += 1;
			return currentHeadingNumber;
		};

		const boundComponent = bindComponentProps(section, { getHeadingNumber: getHeadingNumberFunction });
		components.push(boundComponent);
	}

	return components;
}

// import type { FunctionComponent } from 'react';
// import { bindComponentProps } from './internal/props.js';

// export interface HeadingSelectableProps {
// 	getHeadingNumber: () => number;
// }

// export type ReactHeadingSelectableComponent = FunctionComponent<HeadingSelectableProps> & { numberOfHeadings: number };

// export function headingSelector(headingSelectableComponents: ReactHeadingSelectableComponent[]) {
// 	const components = [];
// 	const getHeadingNumberFunctionState: Record<number, number> = {};

// 	let runningHeadingNumber = 1;
// 	for (const [index, headingSelectableComponent] of headingSelectableComponents.entries()) {
// 		const componentName = headingSelectableComponent.name ?? headingSelectableComponent.displayName ?? '<NO NAME>';
// 		if (typeof headingSelectableComponent.numberOfHeadings !== 'number') {
// 			throw new Error(`Definition of the component ${componentName} is invalid. Please provide numberOfHeadings as a component static`);
// 		}

// 		const startHeadingNumber = runningHeadingNumber;
// 		const endHeadingNumber = runningHeadingNumber + headingSelectableComponent.numberOfHeadings;
// 		runningHeadingNumber = endHeadingNumber;

// 		// Setup getHeadingNumberFunction state
// 		getHeadingNumberFunctionState[index] = startHeadingNumber;

// 		const getHeadingNumberFunction = () => {
// 			const currentHeadingNumber = getHeadingNumberFunctionState[index];
// 			getHeadingNumberFunctionState[index] += 1;
// 			if (getHeadingNumberFunctionState[index] > endHeadingNumber) {
// 				throw new Error(`Component ${componentName} used too many headings. The component declared it wants ${headingSelectableComponent.numberOfHeadings} headings`);
// 			}
// 			return currentHeadingNumber;
// 		};

// 		const boundComponent = bindComponentProps(headingSelectableComponent, { getHeadingNumber: getHeadingNumberFunction });
// 		components.push(boundComponent);
// 	}

// 	return components;
// }
