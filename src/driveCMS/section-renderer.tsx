import CstdError from 'cstd-next/error/CstdError.js';
import type { FolderDescriptorChildren, TypedChildren } from 'cstd-ts/driveCMS/resourceStructureParser.js';
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
	return Object.keys(props.children).map((componentName) => {
		const Component = props.components[componentName.replace('PUBLIC ', '')];
		if (!Component) {
			return <CstdError key={`unknown-${componentName}`} error={new Error(`Unknown section ${componentName}`)} />;
		}

		return <Component key={componentName}>{props.children[componentName]}</Component>;
	});
}
