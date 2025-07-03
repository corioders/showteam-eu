// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { MetadataBase, ObjectWithMetadata } from '@/dataStructure/metadata.js';
import { type DocMd, type DocResource, isDoc } from '@/driveCMS/docs.js';
import { type FolderID, isFolder } from '@/driveCMS/drive.js';
import { getImageDownloadURL, getPublicImageDownloadURL, isImage } from '@/driveCMS/image.js';
import { downloadDocCorrectRevisionMarkdown, listFolder } from '@/driveCMS/index.js';
import type { Resource } from '@/driveCMS/resource.js';
import { type MarkdownDoc, parseMarkdownDocWithMetadata } from '@/format/markdown/index.js';
import type { CountryISO2Code } from '@/internationalization/index.js';
import type { ImageURL } from '@/media/image/index.js';
import { type FetchParserFunction, type FetchParserReturn, defineTypeAggregateFunction, defineTypeAggregateToSingleFunction, defineTypeFunction } from '../index.js';
import { LanguageResourcePrefixParser, type ResourcePrefixParser } from './driveCMSPrefix.js';

// TODO: Make resource with metadata generic over the metadata.
export type ResourceWithMetadata<Metadata extends MetadataBase> = {
	resource: Resource;
} & ObjectWithMetadata<Metadata>;

function parseResourceMetadata<Metadata extends MetadataBase>(resources: Resource[], prefix: ResourcePrefixParser<Metadata>): ResourceWithMetadata<Metadata>[] {
	const recourseWithMetadata: ResourceWithMetadata<Metadata>[] = [];

	for (const resource of resources) {
		const prefixParserReturn = prefix.parser(resource.name);
		if (!prefixParserReturn) {
			continue;
		}

		recourseWithMetadata.push({
			resource: { ...resource, name: prefixParserReturn.newResourceName },
			metadata: prefixParserReturn.metadata,
		});
	}

	return recourseWithMetadata;
}

function copyResourceWithMetadata<Metadata extends MetadataBase>(resourceWithMetadata: ResourceWithMetadata<Metadata>): ResourceWithMetadata<Metadata> {
	return {
		resource: { ...resourceWithMetadata.resource },
		metadata: { ...resourceWithMetadata.metadata },
	};
}

export interface GoogleDriveResourcePrefixUserSpec<Metadata extends MetadataBase> {
	prefix: ResourcePrefixParser<Metadata>;
}

export const typeGoogleDriveSingleResourcePrefix = defineTypeFunction(function typeGoogleDriveResourcePrefix<Metadata extends MetadataBase>(
	us: GoogleDriveResourcePrefixUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<any>, ResourceWithMetadata<Metadata>> {
	return (resourceWithMetadata) => {
		const prefixParserReturn = us.prefix.parser(resourceWithMetadata.resource.name);
		if (!prefixParserReturn) {
			return [false, null];
		}

		const newResourceWithMetadata: ResourceWithMetadata<Metadata> = {
			...resourceWithMetadata,
			resource: {
				...resourceWithMetadata.resource,
				name: prefixParserReturn.newResourceName,
			},
			metadata: prefixParserReturn.metadata,
		};

		return [newResourceWithMetadata, null];
	};
});

export interface GoogleDriveRootFolderUserSpec<Metadata extends MetadataBase> {
	childPrefix: ResourcePrefixParser<Metadata>;
	folderID: FolderID;
}

export const typeGoogleDriveRootFolder = defineTypeFunction(function typeGoogleDriveRootFolder<Metadata extends MetadataBase>(
	us: GoogleDriveRootFolderUserSpec<Metadata>,
): FetchParserFunction<void, ResourceWithMetadata<Metadata>[]> {
	return async () => {
		const [listFolderResult, listFolderError] = await listFolder(us.folderID);
		if (listFolderError) {
			return [null, listFolderError];
		}

		const recourseWithMetadata = parseResourceMetadata(listFolderResult, us.childPrefix);

		return [recourseWithMetadata, null];
	};
});

export interface GoogleDriveSingleFolderUserSpec<Metadata extends MetadataBase> {
	childPrefix: ResourcePrefixParser<Metadata>;
	name?: string;
}
// GoogleDriveSingleFolderUserSpec, ResourceWithMetadata, ResourceWithMetadata[]
export const typeGoogleDriveSingleFolder = defineTypeFunction(function typeGoogleDriveSingleFolder<Metadata extends MetadataBase>(
	us: GoogleDriveSingleFolderUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<any>, ResourceWithMetadata<Metadata>[]> {
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isFolder(resource)) {
			return [false, null];
		}

		if (us.name && resource.name !== us.name) {
			return [false, null];
		}

		const [children, listError] = await listFolder(resource.id);
		if (listError) {
			return [null, listError];
		}

		const childrenWithMetadata = parseResourceMetadata(children, us.childPrefix);
		return [childrenWithMetadata, null];
	};
});

export interface GoogleDriveFolderUserSpec<Metadata extends MetadataBase> {
	childPrefix: ResourcePrefixParser<Metadata>;
}

export type ResourceWithMetadataArrayParent<Metadata extends MetadataBase, ParentMetadata extends MetadataBase> = ResourceWithMetadata<Metadata>[] & {
	parent: ResourceWithMetadata<ParentMetadata>;
};
export const typeGoogleDriveFolder = defineTypeAggregateFunction(function typeGoogleDriveFolder<Metadata extends MetadataBase, ParentMetadata extends MetadataBase>(
	us: GoogleDriveFolderUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<ParentMetadata>[], ResourceWithMetadataArrayParent<Metadata, ParentMetadata>[]> {
	return async (resourcesWithMetadata) => {
		const childrenWithMetadataList: ResourceWithMetadataArrayParent<Metadata, ParentMetadata>[] = [];

		for (const resourceWithMetadata of resourcesWithMetadata) {
			const resource = resourceWithMetadata.resource;
			if (!isFolder(resource)) {
				continue;
			}

			const [children, listError] = await listFolder(resource.id);
			if (listError) {
				return [null, listError];
			}

			const childrenWithMetadata = parseResourceMetadata(children, us.childPrefix) as ResourceWithMetadataArrayParent<Metadata, ParentMetadata>;
			childrenWithMetadata.parent = resourceWithMetadata;
			childrenWithMetadataList.push(childrenWithMetadata);
		}

		return [childrenWithMetadataList, null];
	};
});

export interface GoogleDriveImageUserSpec<Metadata extends MetadataBase> extends GoogleDriveResourcePrefixUserSpec<Metadata> {}
export interface GoogleDriveImage<Metadata extends MetadataBase> {
	downloadURL: ImageURL;
	resourceWithMetadata: ResourceWithMetadata<Metadata>;
}

/**
 * @deprecated please use typeGoogleDriveSingleImagePrivateURL
 */
export const typeGoogleDriveSingleImage = defineTypeFunction(function typeGoogleDriveSingleImage<Metadata extends MetadataBase>(
	us: GoogleDriveImageUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<Metadata>, GoogleDriveImage<Metadata>> {
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isImage(resource)) {
			return [false, null];
		}

		const [newResourceWithMetadata, prefixError] = await typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
		if (newResourceWithMetadata === false) {
			return [false, null];
		}
		if (prefixError) {
			return [null, prefixError];
		}

		const image: GoogleDriveImage<Metadata> = {
			downloadURL: getPublicImageDownloadURL(resource.id),
			resourceWithMetadata: newResourceWithMetadata,
		};

		return [image, null];
	};
});

export const typeGoogleDriveSingleImagePrivateURL = defineTypeFunction(function typeGoogleDriveSingleImagePrivateURL<Metadata extends MetadataBase>(
	us: GoogleDriveImageUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<Metadata>, GoogleDriveImage<Metadata>> {
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isImage(resource)) {
			return [false, null];
		}

		const [newResourceWithMetadata, prefixError] = await typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
		if (newResourceWithMetadata === false) {
			return [false, null];
		}
		if (prefixError) {
			return [null, prefixError];
		}

		const image: GoogleDriveImage<Metadata> = {
			downloadURL: getImageDownloadURL(resource.id),
			resourceWithMetadata: newResourceWithMetadata,
		};

		return [image, null];
	};
});

/**
 * @deprecated please use typeGoogleDriveImagesPrivateURL
 */
export const typeGoogleDriveImages = defineTypeAggregateFunction(function typeGoogleDriveImages<Metadata extends MetadataBase>(
	us: GoogleDriveImageUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<Metadata>[], GoogleDriveImage<Metadata>[]> {
	return async (resourcesWithMetadata) => {
		const images: GoogleDriveImage<Metadata>[] = [];

		for (const resourceWithMetadata of resourcesWithMetadata) {
			const resource = resourceWithMetadata.resource;
			if (!isImage(resource)) {
				continue;
			}

			const [newResourceWithMetadata, prefixError] = await typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
			if (newResourceWithMetadata === false) {
				continue;
			}
			if (prefixError) {
				continue;
			}

			const image: GoogleDriveImage<Metadata> = {
				downloadURL: getPublicImageDownloadURL(resource.id),
				resourceWithMetadata: newResourceWithMetadata,
			};
			images.push(image);
		}

		return [images, null];
	};
});

export const typeGoogleDriveImagesPrivateURL = defineTypeAggregateFunction(function typeGoogleDriveImagesPrivateURL<Metadata extends MetadataBase>(
	us: GoogleDriveImageUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<Metadata>[], GoogleDriveImage<Metadata>[]> {
	return async (resourcesWithMetadata) => {
		const images: GoogleDriveImage<Metadata>[] = [];

		for (const resourceWithMetadata of resourcesWithMetadata) {
			const resource = resourceWithMetadata.resource;
			if (!isImage(resource)) {
				continue;
			}

			const [newResourceWithMetadata, prefixError] = await typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
			if (newResourceWithMetadata === false) {
				continue;
			}
			if (prefixError) {
				continue;
			}

			const image: GoogleDriveImage<Metadata> = {
				downloadURL: getImageDownloadURL(resource.id),
				resourceWithMetadata: newResourceWithMetadata,
			};
			images.push(image);
		}

		return [images, null];
	};
});

export interface GoogleDriveSingleDocUserSpec<Metadata extends MetadataBase> extends GoogleDriveResourcePrefixUserSpec<Metadata> {
	documentName?: string;
}
export const typeGoogleDriveSingleDoc = defineTypeFunction(function typeGoogleDriveSingleDoc<Metadata extends MetadataBase>(
	us: GoogleDriveSingleDocUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<Metadata>, DocMd> {
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isDoc(resource)) {
			return [false, null];
		}

		const [userPrefixedResourceWithMetadata, userPrefixError] = await typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
		if (userPrefixedResourceWithMetadata === false) {
			return [false, null];
		}
		if (userPrefixError) {
			return [null, userPrefixError];
		}

		if (us.documentName) {
			if (userPrefixedResourceWithMetadata.resource.name !== us.documentName) {
				return [false, null];
			}
		}

		const [docMarkdown, downloadError] = await downloadDocCorrectRevisionMarkdown(resource.id);
		if (downloadError) {
			return [null, downloadError];
		}

		return [docMarkdown, null];
	};
});

export interface GoogleDriveInternationalizedDocUserSpec<Metadata extends MetadataBase> extends GoogleDriveResourcePrefixUserSpec<Metadata> {
	documentName?: string;
}

export interface GoogleDriveInternationalizedDocRuntimeArguments {
	lang: CountryISO2Code;
}

export interface GoogleDriveInternationalizedDocMd {
	doc: DocMd;
	resource: DocResource;
}

export const typeGoogleDriveInternationalizedDoc = defineTypeAggregateToSingleFunction(function typeGoogleDriveInternationalizedDoc<Metadata extends MetadataBase>(
	us: GoogleDriveInternationalizedDocUserSpec<Metadata>,
): FetchParserFunction<ResourceWithMetadata<Metadata>[], GoogleDriveInternationalizedDocMd, GoogleDriveInternationalizedDocRuntimeArguments> {
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
	return async (resourcesWithMetadata, runtimeArguments) => {
		let defaultInternationalizeDocMd: GoogleDriveInternationalizedDocMd | null = null;
		let selectedIntlDoc: GoogleDriveInternationalizedDocMd | null = null;

		for (const resourceWithMetadataNotLocal of resourcesWithMetadata) {
			const resourceWithMetadata = copyResourceWithMetadata(resourceWithMetadataNotLocal);
			const resource = resourceWithMetadata.resource;
			if (!isDoc(resource)) {
				continue;
			}

			const [userPrefixedResourceWithMetadata, userPrefixError] = await typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
			if (userPrefixedResourceWithMetadata === false) {
				continue;
			}
			if (userPrefixError) {
				continue;
			}

			const [docMarkdown, downloadError] = await downloadDocCorrectRevisionMarkdown(resource.id);
			if (downloadError) {
				return [null, downloadError];
			}

			if (!defaultInternationalizeDocMd) {
				defaultInternationalizeDocMd = {
					doc: docMarkdown,
					resource: resource,
				};
			}

			const [intlDoc, intlDocError] = await typeGoogleDriveSingleResourcePrefix({ prefix: LanguageResourcePrefixParser })(userPrefixedResourceWithMetadata);
			if (intlDocError) {
				return [null, intlDocError];
			}

			if (!intlDoc) {
				continue;
			}

			if (intlDoc.metadata.countryCodeDS === runtimeArguments.lang) {
				selectedIntlDoc = {
					doc: docMarkdown,
					resource: resource,
				};

				return [selectedIntlDoc, null];
			}
		}

		if (!defaultInternationalizeDocMd) {
			return [false, null];
		}

		if (!selectedIntlDoc) {
			return [defaultInternationalizeDocMd, null];
		}

		return [selectedIntlDoc, null];
	};
});

// biome-ignore lint/complexity/noBannedTypes: This type is required
export type GoogleDriveDocWithMetadataUS = {};

/**  @deprecated use typeMarkdownFrontmatterRootFromGoogleDocParser instead */
export const typeGoogleDriveSingleDocWithMetadata = defineTypeFunction<GoogleDriveDocWithMetadataUS, DocMd, MarkdownDoc>(
	function typeGoogleDriveSingleDocWithMetadata(_us) {
		return (docMd): FetchParserReturn<MarkdownDoc> => {
			const [markdownDoc, parseError] = parseMarkdownDocWithMetadata(docMd.docMd);
			if (parseError) {
				return [null, parseError];
			}

			return [markdownDoc, null];
		};
	},
);
