import CstdError from 'cstd-next/error/CstdError.js';
import RemoteStaticImage from 'cstd-next/media/image/RemoteStaticImage.js';
import type { Children } from 'cstd-next/type/index.js';
import { type ImageResource, getPublicImageDownloadURL } from 'cstd-ts/driveCMS/image.js';
import { UNSAFEChangePermissionsToAnyoneWithLinkReader } from 'cstd-ts/driveCMS/index.js';
import { MIMEType } from 'cstd-ts/driveCMS/resource.js';
import { type FolderChild, getAllChildrenByMIMEType, isFolderChild } from 'cstd-ts/driveCMS/resourceStructureParser.js';
import { type ComponentProps, Fragment, type ReactNode } from 'react';

interface Components {
	item: (props: Pick<ComponentProps<typeof RemoteStaticImage>, 'src' | 'alt'>, resource: ImageResource) => ReactNode;
	root: (props: Children<ReactNode[]>) => ReactNode;
}

interface Props<FolderChildren> {
	children: FolderChild<FolderChildren>;

	components?: Partial<Components>;
}

export async function GalleryRenderer<FolderChildren>(props: Props<FolderChildren>) {
	const section = props.children;
	if (!isFolderChild(section)) {
		return <CstdError error={new Error('Expected a folder')} />;
	}

	const images = getAllChildrenByMIMEType(section.children, MIMEType.image);
	if (images.length === 0) {
		return <CstdError error={new Error(`Missing images in ${section.resource.name}`)} />;
	}

	const components = { ...defaultComponents, ...props.components };

	const items: ReactNode[] = [];
	for (const { resource } of images) {
		const [_, changePermissionsError] = await UNSAFEChangePermissionsToAnyoneWithLinkReader(resource.id);
		if (changePermissionsError) {
			return <CstdError error={changePermissionsError} />;
		}

		items.push(<Fragment key={resource.id}>{components.item({ src: getPublicImageDownloadURL(resource.id), alt: resource.name }, resource)}</Fragment>);
	}

	return <components.root>{items}</components.root>;
}

const defaultComponents: Components = {
	item: (props) => <RemoteStaticImage {...props} loading="lazy" />,
	root: (props) => <section {...props} />,
} as const;
