// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import type { MetadataBase, ObjectWithMetadata } from "@/dataStructure/metadata.js";
import { type DocMd, type DocResource, isDoc } from "@/driveCMS/docs.js";
import { type FolderID, type FolderResource, isFolder } from "@/driveCMS/drive.js";
import { type FileUploadOptions, isForm } from "@/driveCMS/form.js";
import type { Form } from "@/driveCMS/form-client-side.js";
import { getImageDownloadURL, getPublicImageDownloadURL, isImage } from "@/driveCMS/image.js";
import { downloadDocCorrectRevisionMarkdown, downloadSpreadsheetCorrectRevision, getForm, listFolder } from "@/driveCMS/index.js";
import type { Resource } from "@/driveCMS/resource.js";
import { isSpreadsheet, type Spreadsheet } from "@/driveCMS/spreadsheet.js";
import { type MarkdownDoc, parseMarkdownDocWithMetadata } from "@/format/markdown/index.js";
import type { CountryISO2Code } from "@/internationalization/index.js";
import type { ImageURL } from "@/media/image/index.js";

import {
	defineTypeAggregateFunction,
	defineTypeAggregateFunctionPromise,
	defineTypeAggregateToSingleFunctionPromise,
	defineTypeFunction,
	defineTypeFunctionPromise,
	type FetchParserFunction,
	type FetchParserFunctionPromise,
} from "../index.js";
import type { OrderMetadata } from "../metadata/index.js";
import { LanguageResourcePrefixParser, type ResourcePrefixParser } from "./drive-cms-prefix.js";

interface DebugConfig {
	__debug?: {
		logResult?: boolean;
	};
}

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
			metadata: prefixParserReturn.metadata,
			resource: { ...resource, name: prefixParserReturn.newResourceName },
		});
	}

	return recourseWithMetadata;
}

function copyResourceWithMetadata<Metadata extends MetadataBase>(resourceWithMetadata: ResourceWithMetadata<Metadata>): ResourceWithMetadata<Metadata> {
	return {
		metadata: { ...resourceWithMetadata.metadata },
		resource: { ...resourceWithMetadata.resource },
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
			metadata: prefixParserReturn.metadata,
			resource: {
				...resourceWithMetadata.resource,
				name: prefixParserReturn.newResourceName,
			},
		};

		return [newResourceWithMetadata, null];
	};
});

export interface GoogleDriveRootFolderUserSpec<Metadata extends MetadataBase> {
	childPrefix: ResourcePrefixParser<Metadata>;
	folderID: FolderID;
}

export const typeGoogleDriveRootFolder = defineTypeFunctionPromise(function typeGoogleDriveRootFolder<Metadata extends MetadataBase>(
	us: GoogleDriveRootFolderUserSpec<Metadata>,
): FetchParserFunctionPromise<void, ResourceWithMetadata<Metadata>[]> {
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
	// TODO: rename childPrefix to prefixChild for nice sorting
	childPrefix: ResourcePrefixParser<Metadata>;
	prefix?: ResourcePrefixParser<any>;
	name?: string;
}
// GoogleDriveSingleFolderUserSpec, ResourceWithMetadata, ResourceWithMetadata[]
export const typeGoogleDriveSingleFolder = defineTypeFunctionPromise(function typeGoogleDriveSingleFolder<Metadata extends MetadataBase>(
	us: GoogleDriveSingleFolderUserSpec<Metadata>,
): FetchParserFunctionPromise<ResourceWithMetadata<any>, ResourceWithMetadata<Metadata>[]> {
	const usDebug = us as DebugConfig;
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isFolder(resource)) {
			return [false, null];
		}
		let folderResource: FolderResource = resource;

		if (us.prefix) {
			const [newResourceWithMetadata, prefixError] = typeGoogleDriveSingleResourcePrefix({ prefix: us.prefix })(resourceWithMetadata);
			if (newResourceWithMetadata === false) {
				return [false, null];
			}
			if (prefixError) {
				return [null, prefixError];
			}

			folderResource = newResourceWithMetadata.resource as FolderResource;
		}

		if (us.name && folderResource.name !== us.name) {
			return [false, null];
		}

		const [children, listError] = await listFolder(folderResource.id);
		if (listError) {
			return [null, listError];
		}

		if (usDebug.__debug?.logResult) {
			console.log("DEBUG typeGoogleDriveSingleFolder");

			console.log("listing", folderResource, "got us", children);
		}

		const childrenWithMetadata = parseResourceMetadata(children, us.childPrefix);

		// ==================================================
		// TODO Remove for DSDv2
		// DSDv2 will have good support for parents
		for (const child of childrenWithMetadata) {
			(child as unknown as { ___parent: FolderResource }).___parent = folderResource;
		}
		// ==================================================

		return [childrenWithMetadata, null];
	};
});

export interface GoogleDriveFolderUserSpec<Metadata extends MetadataBase> {
	childPrefix: ResourcePrefixParser<Metadata>;
	prefix?: ResourcePrefixParser<any>;
}

export type ResourceWithMetadataArrayParent<Metadata extends MetadataBase, ParentMetadata extends MetadataBase> = ResourceWithMetadata<Metadata>[] & {
	parent: ResourceWithMetadata<ParentMetadata>;
};
export const typeGoogleDriveFolder = defineTypeAggregateFunctionPromise(function typeGoogleDriveFolder<
	Metadata extends MetadataBase,
	ParentMetadata extends MetadataBase,
>(
	us: GoogleDriveFolderUserSpec<Metadata>,
): FetchParserFunctionPromise<ResourceWithMetadata<ParentMetadata>[], ResourceWithMetadataArrayParent<Metadata, ParentMetadata>[]> {
	const usDebug = us as DebugConfig;
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO Remove for DSDv2
	return async (resourcesWithMetadata) => {
		let childrenWithMetadataList: ResourceWithMetadataArrayParent<Metadata, ParentMetadata>[] = [];

		// ==================================================
		// TODO Remove for DSDv2
		let sort = true;
		// ==================================================
		for (const resourceWithMetadata of resourcesWithMetadata) {
			const resource = resourceWithMetadata.resource;
			if (!isFolder(resource)) {
				continue;
			}

			let folderResourceWithMetadata = resourceWithMetadata;
			if (us.prefix) {
				const [newResourceWithMetadata, prefixError] = typeGoogleDriveSingleResourcePrefix({ prefix: us.prefix })(resourceWithMetadata);
				if (newResourceWithMetadata === false) {
					continue;

					// ==================================================
					// TODO Fix this function to also return errors
					// DSDv2
					// return [false, null];
					// ==================================================
				}
				if (prefixError) {
					continue;
					// ==================================================
					// TODO Fix this function to also return errors
					// DSDv2
					// return [null, prefixError];
					// ==================================================
				}

				folderResourceWithMetadata = newResourceWithMetadata;
			}

			// ==================================================
			// TODO Remove for DSDv2
			if (folderResourceWithMetadata) {
				const orderingNumber = (folderResourceWithMetadata?.metadata as unknown as OrderMetadata)?.orderNumberDS;
				if (orderingNumber === undefined) {
					sort = false;
				}
			}
			// ==================================================

			const [children, listError] = await listFolder(resource.id);
			if (listError) {
				return [null, listError];
			}

			if (usDebug?.__debug?.logResult) {
				console.log("typeGoogleDriveFolder DEBUG");
				console.log(resource);
				console.log(children);
			}

			const childrenWithMetadata = parseResourceMetadata(children, us.childPrefix) as ResourceWithMetadataArrayParent<Metadata, ParentMetadata>;
			childrenWithMetadata.parent = folderResourceWithMetadata;

			childrenWithMetadataList.push(childrenWithMetadata);
		}

		// ==================================================
		// TODO Remove for DSDv2
		if (sort) {
			childrenWithMetadataList = childrenWithMetadataList.sort((a, b) => {
				const aOrder = (a.parent.metadata as unknown as OrderMetadata).orderNumberDS;
				const bOrder = (b.parent.metadata as unknown as OrderMetadata).orderNumberDS;

				return aOrder - bOrder;
			});
		}
		// ==================================================

		return [childrenWithMetadataList, null];
	};
});

export interface GoogleDriveImageUserSpec<Metadata extends MetadataBase> extends GoogleDriveResourcePrefixUserSpec<Metadata> {
	imageName?: string;
}

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
	return (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isImage(resource)) {
			return [false, null];
		}

		const [newResourceWithMetadata, prefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
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
	return (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isImage(resource)) {
			return [false, null];
		}

		const [newResourceWithMetadata, prefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
		if (newResourceWithMetadata === false) {
			return [false, null];
		}
		if (prefixError) {
			return [null, prefixError];
		}

		if (us.imageName) {
			if (newResourceWithMetadata.resource.name !== us.imageName) {
				return [false, null];
			}
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
): FetchParserFunction<ResourceWithMetadata<any>[], GoogleDriveImage<Metadata>[]> {
	return (resourcesWithMetadata) => {
		const images: GoogleDriveImage<Metadata>[] = [];

		for (const resourceWithMetadata of resourcesWithMetadata) {
			const resource = resourceWithMetadata.resource;
			if (!isImage(resource)) {
				continue;
			}

			const [newResourceWithMetadata, prefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
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
): FetchParserFunction<ResourceWithMetadata<any>[], GoogleDriveImage<Metadata>[]> {
	return (resourcesWithMetadata) => {
		const images: GoogleDriveImage<Metadata>[] = [];

		for (const resourceWithMetadata of resourcesWithMetadata) {
			const resource = resourceWithMetadata.resource;
			if (!isImage(resource)) {
				continue;
			}

			const [newResourceWithMetadata, prefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
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
export const typeGoogleDriveSingleDoc = defineTypeFunctionPromise(function typeGoogleDriveSingleDoc<Metadata extends MetadataBase>(
	us: GoogleDriveSingleDocUserSpec<Metadata>,
): FetchParserFunctionPromise<ResourceWithMetadata<Metadata>, DocMd> {
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isDoc(resource)) {
			return [false, null];
		}

		const [userPrefixedResourceWithMetadata, userPrefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
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

export const typeGoogleDriveInternationalizedDoc = defineTypeAggregateToSingleFunctionPromise(function typeGoogleDriveInternationalizedDoc<Metadata extends MetadataBase>(
	us: GoogleDriveInternationalizedDocUserSpec<Metadata>,
): FetchParserFunctionPromise<ResourceWithMetadata<Metadata>[], GoogleDriveInternationalizedDocMd, GoogleDriveInternationalizedDocRuntimeArguments> {
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
	return async (resourcesWithMetadata, runtimeArguments) => {
		let defaultInternationalizeDocMd: GoogleDriveInternationalizedDocMd | null = null;
		let selectedIntlDoc: GoogleDriveInternationalizedDocMd | null = null;

		for (const resourceWithMetadataNotLocal of resourcesWithMetadata) {
			const resourceWithMetadata = copyResourceWithMetadata(resourceWithMetadataNotLocal);
			const resource = resourceWithMetadata.resource;
			if (!isDoc(resource)) {
				continue;
			}

			const [userPrefixedResourceWithMetadata, userPrefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
			if (userPrefixedResourceWithMetadata === false) {
				continue;
			}
			if (userPrefixError) {
				continue;
			}

			const [intlDoc, intlDocError] = typeGoogleDriveSingleResourcePrefix({ prefix: LanguageResourcePrefixParser })(userPrefixedResourceWithMetadata);
			if (intlDocError) {
				return [null, intlDocError];
			}
			if (!intlDoc) {
				continue;
			}

			if (us.documentName) {
				if (intlDoc.resource.name !== us.documentName) {
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
		return (docMd) => {
			const [markdownDoc, parseError] = parseMarkdownDocWithMetadata(docMd.docMd);
			if (parseError) {
				return [null, parseError];
			}

			return [markdownDoc, null];
		};
	},
);

export interface GoogleDriveSingleSpreadsheetUserSpec<Metadata extends MetadataBase> extends GoogleDriveResourcePrefixUserSpec<Metadata> {
	spreadsheetName?: string;
}

export const typeGoogleDriveSingleSpreadsheet = defineTypeFunctionPromise(function typeGoogleDriveSingleSpreadsheet<Metadata extends MetadataBase>(
	us: GoogleDriveSingleSpreadsheetUserSpec<Metadata>,
): FetchParserFunctionPromise<ResourceWithMetadata<Metadata>, Spreadsheet> {
	return async (resourceWithMetadata) => {
		const resource = resourceWithMetadata.resource;
		if (!isSpreadsheet(resource)) {
			return [false, null];
		}

		const [userPrefixedResourceWithMetadata, userPrefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
		if (userPrefixedResourceWithMetadata === false) {
			return [false, null];
		}
		if (userPrefixError) {
			return [null, userPrefixError];
		}

		if (us.spreadsheetName) {
			if (userPrefixedResourceWithMetadata.resource.name !== us.spreadsheetName) {
				return [false, null];
			}
		}

		const [docMarkdown, downloadError] = await downloadSpreadsheetCorrectRevision(resource.id);
		if (downloadError) {
			return [null, downloadError];
		}

		return [docMarkdown, null];
	};
});

export interface GoogleDriveSingleFormUserSpec<Metadata extends MetadataBase> extends GoogleDriveResourcePrefixUserSpec<Metadata> {
	formName?: string;
	fileUploadOptions?: {
		enabled: boolean;
		permissions?: FileUploadOptions["permissions"];
	};
}

export const typeGoogleDriveSingleForm = defineTypeFunctionPromise(function typeGoogleDriveSingleForm<Metadata extends MetadataBase>(
	us: GoogleDriveSingleFormUserSpec<Metadata>,
): FetchParserFunctionPromise<ResourceWithMetadata<Metadata>, Form> {
	return async (resourceWithMetadata) => {
		const formResource = resourceWithMetadata.resource;
		if (!isForm(formResource)) {
			return [false, null];
		}

		const [userPrefixedResourceWithMetadata, userPrefixError] = typeGoogleDriveSingleResourcePrefix(us)(resourceWithMetadata);
		if (userPrefixedResourceWithMetadata === false) {
			return [false, null];
		}
		if (userPrefixError) {
			return [null, userPrefixError];
		}

		if (us.formName) {
			if (userPrefixedResourceWithMetadata.resource.name !== us.formName) {
				return [false, null];
			}
		}

		if (us.fileUploadOptions?.enabled) {
			// ==================================================
			// TODO Remove for DSDv2
			// DSDv2 will have good support for parents
			const parent = (resourceWithMetadata as unknown as { ___parent: FolderResource }).___parent;
			// ==================================================

			const fileUploadOptions: FileUploadOptions = {
				parentFolderToTheRootUploadFolder: parent.id,
			};

			if (us.fileUploadOptions.permissions) {
				fileUploadOptions.permissions = us.fileUploadOptions.permissions;
			}

			return getForm(formResource.id, fileUploadOptions);
		}

		return getForm(formResource.id);
	};
});

// async function setupPermissionsForCreatedFormUploadFolder(formID: FormID, createdUploadFolderID: FolderID): Promise<Error | null> {
// 	const formClearPermissionsError = await clearAllPermissions(formID, [SERVICE_ACCOUNT_EMAIL]);

// 	console.log(formClearPermissionsError);

// 	const formAddPermissionsError = await addPermission(formID, WORK_RODO_GOOGLE_ACCOUNT_EMAIL, "writer");
// 	if (formAddPermissionsError) {
// 		return formAddPermissionsError;
// 	}

// 	const clearPermissionsError = await clearAllPermissions(createdUploadFolderID, [SERVICE_ACCOUNT_EMAIL]);

// 	console.log(clearPermissionsError);

// 	const addPermissionsError = await addPermission(createdUploadFolderID, WORK_RODO_GOOGLE_ACCOUNT_EMAIL, "writer");
// 	if (addPermissionsError) {
// 		return addPermissionsError;
// 	}

// 	const addPermissionError = await addPermission(createdUploadFolderID, CORIODERS_FORM_UPLOAD_SERVICE_ACCOUNT_EMAIL, "writer");
// 	if (addPermissionError) {
// 		return addPermissionError;
// 	}

// 	return null;
// }
