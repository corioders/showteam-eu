import CstdError from 'cstd-next/error/CstdError.js';
import type { FolderDescriptorChildren, TypedChildren } from 'cstd-ts/driveCMS/resourceStructureParser/index.js';
import { getOrderedChildren } from 'cstd-ts/driveCMS/resourceStructureParser/prefix.js';
import type { ReactNode } from 'react';

interface Props<FolderChildren extends FolderDescriptorChildren> {
	children: TypedChildren<FolderChildren>;

	components: { [Key in keyof TypedChildren<FolderChildren>]: (props: { children: TypedChildren<FolderChildren>[Key] }) => ReactNode };
}

/* 
TODO: find a better name

?FsdRenderer?
 */
export function SectionRenderer<FolderChildren extends FolderDescriptorChildren>(props: Props<FolderChildren>) {
	const childrenWithName = Object.keys(props.children).map((name) => ({ name, child: props.children[name] }));
	const [sortedChildrenWithName, sortError] = getOrderedChildren(childrenWithName);
	if (sortError) {
		return <CstdError error={sortError} />;
	}

	return sortedChildrenWithName.map((childWithName) => {
		const componentName = childWithName.name;

		const Component = props.components[componentName];
		if (!Component) {
			return <CstdError key={`unknown-${componentName}`} error={new Error(`Unknown section ${componentName}`)} />;
		}

		return <Component key={componentName}>{props.children[componentName]}</Component>;
	});
}
