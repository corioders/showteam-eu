import type { FolderDescriptorChildren, TypedChildren } from "cstd-ts/driveCMS/resourceStructureParser/index.js";
import { type ChildWithName, getOrderedChildren } from "cstd-ts/driveCMS/resourceStructureParser/prefix.js";
import type { ErrorReturn } from "cstd-ts/error/index.js";
import type { ReactNode } from "react";

import { CstdError } from "@/error/cstd-error.jsx";

/** @deprecated use renderSections from cstd-next/src/dataSchemaSection/index.ts*/
export interface SectionProps<T> {
	section: T;
	// // todo: rename, 7 is not a heading level anymore
	// getHeadingLevel: () => number;
}

/** @deprecated use renderSections from cstd-next/src/dataSchemaSection/index.ts*/
interface Props<FolderChildren extends FolderDescriptorChildren> {
	sectionsFolder: TypedChildren<FolderChildren>;

	components: {
		[Key in keyof TypedChildren<FolderChildren>]: (props: SectionProps<TypedChildren<FolderChildren>[Key]>) => ReactNode;
	};
}

/* 
 find a better name

?FsdRenderer?
 */
/** @deprecated use renderSections from cstd-next/src/dataSchemaSection/index.ts*/
export function SectionRenderer<FolderChildren extends FolderDescriptorChildren>(props: Props<FolderChildren>) {
	const childrenWithName = Object.keys(props.sectionsFolder).map((name) => ({ child: props.sectionsFolder[name], name }));
	const [sortedChildrenWithName, sortError]: ErrorReturn<ChildWithName[]> = getOrderedChildren(childrenWithName);
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
			return <CstdError error={new Error(`Unknown section ${componentName}`)} key={`unknown-${componentName}`} />;
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
