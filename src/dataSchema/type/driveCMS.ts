// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import { TypedSymbolMap } from '@/datastructure/index.js';
import { type DocMd, type DocResource, isDoc } from '@/driveCMS/docs.js';
import { type FolderID, isFolder } from '@/driveCMS/drive.js';
import { getImageDownloadURL, getPublicImageDownloadURL, isImage } from '@/driveCMS/image.js';
import { downloadDocCorrectRevisionMarkdown, listFolder } from '@/driveCMS/index.js';
import type { Resource } from '@/driveCMS/resource.js';
import { type MarkdownDoc, parseMarkdownDocWithMetadata } from '@/format/markdown/index.js';
import { type CountryISO2Code, isCountryISO2Code } from '@/internationalization/index.js';
import type { ImageURL } from '@/media/image/index.js';
import { type FetchParserPromiseReturn, type FetchParserReturn, defineTypeAggregateFunction, defineTypeAggregateToSingleFunction, defineTypeFunction } from '../index.js';
import { LanguageResourcePrefixParser, NoPrefix, type ResourcePrefixParser, getLanguagePrefix } from './driveCMSPrefix.js';

export interface ResourceWithMetadata {
	resource: Resource;
	metadata: TypedSymbolMap;
}

export interface ResourceWithMetadataAndParent extends ResourceWithMetadata {
	parent: ResourceWithMetadata;
}

function parseResourceMetadata(resources: Resource[], prefix: ResourcePrefixParser): ResourceWithMetadata[] {
	const recourseWithMetadata: ResourceWithMetadata[] = [];

	for (const resource of resources) {
		const metadata = new TypedSymbolMap();
		const newResourceName = prefix.parser(resource.name, metadata);
		// Resource should not be matched
		if (newResourceName === false) {
			continue;
		}

		recourseWithMetadata.push({
			resource: { ...resource, name: newResourceName },
			metadata,
		});
	}

	return recourseWithMetadata;
}

function copyResourceWithMetadata(resourceWithMetadata: ResourceWithMetadata): ResourceWithMetadata {
	return {
		resource: resourceWithMetadata.resource,
		metadata: resourceWithMetadata.metadata.copy(),
	};
}

export interface GoogleDriveResourcePrefixUS {
	prefix?: ResourcePrefixParser;
}
export const typeGoogleDriveSingleResourcePrefix = defineTypeFunction<GoogleDriveResourcePrefixUS, ResourceWithMetadata, ResourceWithMetadata>(
	function typeGoogleDriveResourcePrefix(us) {
		return (resourceWithMetadata) => {
			if (!us.prefix) {
				return [resourceWithMetadata, null];
			}

			const newResourceName = us.prefix.parser(resourceWithMetadata.resource.name, resourceWithMetadata.metadata);
			if (newResourceName === false) {
				return [false, null];
			}

			const newResourceWithMetadata: ResourceWithMetadata = {
				...resourceWithMetadata,
				resource: {
					...resourceWithMetadata.resource,
					name: newResourceName,
				},
			};

			return [newResourceWithMetadata, null];
		};
	},
);

// export const typeGoogleDriveResourcePrefix = defineTypeAggregateFunction<GoogleDriveResourcePrefixUS, ResourceWithMetadata, ResourceWithMetadata>(
// 	() => true,
// 	function typeGoogleDriveResourcePrefix(us) {
// 		return async (resourcesWithMetadata) => {
// 			const newResourcesWithMetadata: ResourceWithMetadata[] = []
// 			for (const resourceWithMetadata of resourcesWithMetadata) {
// 				const newResourceName = us.prefix.parser(resourceWithMetadata.resource.name, resourceWithMetadata.metadata)
// 				if (newResourceName === false) {
// 					continue
// 				}

// 				const newResourceWithMetadata: ResourceWithMetadata = {
// 					...resourceWithMetadata,
// 					resource: {
// 						...resourceWithMetadata.resource,
// 						name: newResourceName
// 					},
// 				}

// 				newResourcesWithMetadata.push(newResourceWithMetadata)
// 			}

// 			return [newResourcesWithMetadata, null];
// 		};
// 	}
// );

export interface GoogleDriveRootFolderUS {
	childPrefix: ResourcePrefixParser;
	folderID: FolderID;
}
export const typeGoogleDriveRootFolder = defineTypeFunction<GoogleDriveRootFolderUS, void, ResourceWithMetadata[]>(function typeGoogleDriveRootFolder(us) {
	return async () => {
		const [listFolderResult, listFolderError] = await listFolder(us.folderID);
		if (listFolderError) {
			return [null, listFolderError];
		}

		const recourseWithMetadata = parseResourceMetadata(listFolderResult, us.childPrefix);

		return [recourseWithMetadata, null];
	};
});

export interface GoogleDriveSingleFolderUS {
	childPrefix?: ResourcePrefixParser;
	name?: string;
}
export const typeGoogleDriveSingleFolder = defineTypeFunction<GoogleDriveSingleFolderUS, ResourceWithMetadata, ResourceWithMetadata[]>(
	function typeGoogleDriveSingleFolder(us) {
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

			const prefix = us.childPrefix ?? NoPrefix();

			const childrenWithMetadata = parseResourceMetadata(children, prefix);
			return [childrenWithMetadata, null];
		};
	},
);

export interface GoogleDriveFolderUS {
	childPrefix: ResourcePrefixParser;
}
export type ResourceWithMetadataArrayParent = ResourceWithMetadata[] & { parent: ResourceWithMetadata };
export const typeGoogleDriveFolder = defineTypeAggregateFunction<GoogleDriveFolderUS, ResourceWithMetadata, ResourceWithMetadataArrayParent>(
	function typeGoogleDriveFolder(us) {
		return async (resourcesWithMetadata) => {
			const childrenWithMetadataList: ResourceWithMetadataArrayParent[] = [];

			for (const resourceWithMetadata of resourcesWithMetadata) {
				const resource = resourceWithMetadata.resource;
				if (!isFolder(resource)) {
					continue;
				}

				const [children, listError] = await listFolder(resource.id);
				if (listError) {
					return [null, listError];
				}

				const childrenWithMetadata = parseResourceMetadata(children, us.childPrefix) as ResourceWithMetadataArrayParent;
				childrenWithMetadata.parent = resourceWithMetadata;
				childrenWithMetadataList.push(childrenWithMetadata);
			}

			return [childrenWithMetadataList, null];
		};
	},
);

export interface GoogleDriveImageUS extends GoogleDriveResourcePrefixUS {}
export interface GoogleDriveImage {
	downloadURL: ImageURL;
	resourceWithMetadata: ResourceWithMetadata;
}

/**
 * @deprecated please use typeGoogleDriveSingleImagePrivateURL
 */
export const typeGoogleDriveSingleImage = defineTypeFunction<GoogleDriveImageUS, ResourceWithMetadata, GoogleDriveImage>(function typeGoogleDriveSingleImage(us) {
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

		const image: GoogleDriveImage = {
			downloadURL: getPublicImageDownloadURL(resource.id),
			resourceWithMetadata: newResourceWithMetadata,
		};

		return [image, null];
	};
});

export const typeGoogleDriveSingleImagePrivateURL = defineTypeFunction<GoogleDriveImageUS, ResourceWithMetadata, GoogleDriveImage>(
	function typeGoogleDriveSingleImagePrivateURL(us) {
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

			const image: GoogleDriveImage = {
				downloadURL: getImageDownloadURL(resource.id),
				resourceWithMetadata: newResourceWithMetadata,
			};

			return [image, null];
		};
	},
);

export const typeGoogleDriveImages = defineTypeAggregateFunction<GoogleDriveImageUS, ResourceWithMetadata, GoogleDriveImage>(function typeGoogleDriveImages(us) {
	return async (resourcesWithMetadata) => {
		const images: GoogleDriveImage[] = [];

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

			const image: GoogleDriveImage = {
				downloadURL: getPublicImageDownloadURL(resource.id),
				resourceWithMetadata: newResourceWithMetadata,
			};
			images.push(image);
		}

		return [images, null];
	};
});

export interface GoogleDriveSingleDocUS extends GoogleDriveResourcePrefixUS {
	documentName?: string;
}
export const typeGoogleDriveSingleDoc = defineTypeFunction<GoogleDriveSingleDocUS, ResourceWithMetadata, DocMd>(function typeGoogleDriveSingleDoc(us) {
	return async (resourceWithMetadata): FetchParserPromiseReturn<DocMd> => {
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

export interface GoogleDriveInternationalizedDocUS extends GoogleDriveResourcePrefixUS {
	documentName?: string;
}
export interface GoogleDriveInternationalizedDocMd {
	doc: DocMd;
	resource: DocResource;
}

export interface GoogleDriveInternationalizedDocRA {
	lang: CountryISO2Code;
}

export const typeGoogleDriveInternationalizedDoc = defineTypeAggregateToSingleFunction<
	GoogleDriveInternationalizedDocUS,
	ResourceWithMetadata,
	GoogleDriveInternationalizedDocMd,
	GoogleDriveInternationalizedDocRA
>(function typeGoogleDriveInternationalizedDoc(us) {
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
	return async (resourcesWithMetadata, runtimeArguments) => {
		let defaultInternationalizeDocMd: GoogleDriveInternationalizedDocMd | null = null;
		let intlDoc: GoogleDriveInternationalizedDocMd | null = null;

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

			const docMaybeIntlResource = getMaybeInternationalizedResource(userPrefixedResourceWithMetadata);
			if (us.documentName) {
				if (docMaybeIntlResource.resource.name !== us.documentName) {
					continue;
				}
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

			const langPrefix = getLanguagePrefix(docMaybeIntlResource.metadata);
			if (langPrefix) {
				if (!isCountryISO2Code(langPrefix)) {
					return [null, new Error(`Language prefix: ${langPrefix} is not a CountryISO2Code`)];
				}

				if (langPrefix === runtimeArguments.lang) {
					intlDoc = {
						doc: docMarkdown,
						resource: resource,
					};
				}
			}
		}

		if (!defaultInternationalizeDocMd) {
			return [false, null];
		}

		if (!intlDoc) {
			return [defaultInternationalizeDocMd, null];
		}

		return [intlDoc, null];
	};
});

function getMaybeInternationalizedResource(resourceWithMetadata: ResourceWithMetadata): ResourceWithMetadata {
	// TODO: Remove this as, make types smarter
	const [langPrefixedRecourseWithMetadata, _languagePrefixError] = typeGoogleDriveSingleResourcePrefix({ prefix: LanguageResourcePrefixParser })(
		resourceWithMetadata,
	) as Awaited<ReturnType<ReturnType<typeof typeGoogleDriveSingleResourcePrefix>>>;
	if (langPrefixedRecourseWithMetadata) {
		return langPrefixedRecourseWithMetadata;
	}

	return resourceWithMetadata;
}

// biome-ignore lint/complexity/noBannedTypes: This type is required
export type GoogleDriveDocWithMetadataUS = {};
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
