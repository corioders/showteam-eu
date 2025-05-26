import CstdError from 'cstd-next/error/CstdError.js';
import type { FolderDescriptorChildren, TypedChildren } from 'cstd-ts/driveCMS/resourceStructureParser/index.js';
import { getOrderedChildren } from 'cstd-ts/driveCMS/resourceStructureParser/prefix.js';
import type { ReactNode } from 'react';

export interface SectionProps<T> {
	section: T;
	// // todo: rename, 7 is not a heading level anymore
	// getHeadingLevel: () => number;
}
interface Props<FolderChildren extends FolderDescriptorChildren> {
	sectionsFolder: TypedChildren<FolderChildren>;

	components: {
		[Key in keyof TypedChildren<FolderChildren>]: (props: SectionProps<TypedChildren<FolderChildren>[Key]>) => ReactNode;
	};
}

/* 
TODO: find a better name

?FsdRenderer?
 */
export function SectionRenderer<FolderChildren extends FolderDescriptorChildren>(props: Props<FolderChildren>) {
	const childrenWithName = Object.keys(props.sectionsFolder).map((name) => ({ name, child: props.sectionsFolder[name] }));
	const [sortedChildrenWithName, sortError] = getOrderedChildren(childrenWithName);
	if (sortError) {
		return <CstdError error={sortError} />;
	}

	// let level = 1;
	// function getHeadingLevel() {
	// 	return level++;
	// }

	return sortedChildrenWithName.map((childWithName) => {
		const componentName = childWithName.name;

		const Component = props.components[componentName];
		if (!Component) {
			return <CstdError key={`unknown-${componentName}`} error={new Error(`Unknown section ${componentName}`)} />;
		}

		return (
			<Component
				key={componentName}
				// getHeadingLevel={getHeadingLevel}
				section={props.sectionsFolder[componentName]}
			/>
		);
	});
}
