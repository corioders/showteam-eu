import { getPublicImageDownloadURL, type ImageResource } from "cstd-ts/driveCMS/image.js";
import { UNSAFEChangePermissionsToAnyoneWithLinkReader } from "cstd-ts/driveCMS/index.js";
import { MIMEType } from "cstd-ts/driveCMS/resource.js";
import { type FolderChild, getAllChildrenByMIMEType, isFolderChild } from "cstd-ts/driveCMS/resourceStructureParser/index.js";
import { type ComponentProps, Fragment, type ReactNode } from "react";

import { CstdError } from "@/error/cstd-error.jsx";
import { RemoteStaticImage } from "@/media/image/remote-static-image.jsx";
import type { Children } from "@/type/index.js";

interface Components {
	item: (props: Pick<ComponentProps<typeof RemoteStaticImage>, "src" | "alt">, resource: ImageResource) => ReactNode;
	root: (props: Children<ReactNode[]>) => ReactNode;
}

interface Props<FolderChildren> {
	galleryFolder: FolderChild<FolderChildren>;

	components?: Partial<Components>;
}

export async function GalleryRenderer<FolderChildren>({ galleryFolder, ...props }: Props<FolderChildren>) {
	if (!isFolderChild(galleryFolder)) {
		return <CstdError error={new Error("Expected a folder")} />;
	}

	const images = getAllChildrenByMIMEType(galleryFolder.children, MIMEType.image);
	if (images.length === 0) {
		return <CstdError error={new Error(`Missing images in ${galleryFolder.resource.name}`)} />;
	}

	const components = { ...defaultComponents, ...props.components };

	const items: ReactNode[] = [];
	for (const { resource } of images) {
		const [_, changePermissionsError] = await UNSAFEChangePermissionsToAnyoneWithLinkReader(resource.id);
		if (changePermissionsError) {
			return <CstdError error={changePermissionsError} />;
		}

		items.push(<Fragment key={resource.id}>{components.item({ alt: resource.name, src: getPublicImageDownloadURL(resource.id) }, resource)}</Fragment>);
	}

	return <components.root>{items}</components.root>;
}

const defaultComponents: Components = {
	item: (props) => <RemoteStaticImage {...props} decoding="async" loading="lazy" />,
	root: (props) => <section {...props} />,
} as const;
