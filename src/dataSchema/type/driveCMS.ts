// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

import { TypedSymbolMap } from '@/datastructure/index.js';
import { DocMd, isDoc } from '@/driveCMS/docs.js';
import { FolderID, isFolder } from '@/driveCMS/drive.js';
import { isImage } from '@/driveCMS/image.js';
import { downloadDocCorrectRevisionMarkdown, listFolder } from '@/driveCMS/index.js';
import { Resource } from '@/driveCMS/resource.js';
import { MarkdownDoc, parseMarkdownDocWithMetadata } from '@/format/markdown/index.js';
import { FetchParserPromiseReturn, FetchParserReturn, defineTypeAggregateFunction, defineTypeFunction } from '../index.js';
import { ResourcePrefixParser } from './driveCMSPrefix.js';

export interface ResourceWithMetadata {
	resource: Resource;
	metadata: TypedSymbolMap;
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

export interface GoogleDriveRootFolderUS {
	prefix: ResourcePrefixParser;
	folderID: FolderID;
}
export const typeGoogleDriveRootFolder = defineTypeFunction(null, function typeGoogleDriveRootFolder(us: GoogleDriveRootFolderUS) {
	return async (): FetchParserPromiseReturn<ResourceWithMetadata[]> => {
		const [listFolderResult, listFolderError] = await listFolder(us.folderID);
		if (listFolderError) {
			return [null, listFolderError];
		}

		const recourseWithMetadata = parseResourceMetadata(listFolderResult, us.prefix);

		return [recourseWithMetadata, null];
	};
});

export interface GoogleDriveFolderUS {
	prefix: ResourcePrefixParser;
}
export const typeGoogleDriveSingleFolder = defineTypeFunction(typeGoogleDriveRootFolder, (us: GoogleDriveFolderUS) => {
	return async (resourceWithMetadata): FetchParserPromiseReturn<ResourceWithMetadata[]> => {
		const resource = resourceWithMetadata.resource;
		if (!isFolder(resource)) {
			return [false, null];
		}

		const [children, listError] = await listFolder(resource.id);
		if (listError) {
			return [null, listError];
		}

		const childrenWithMetadata = parseResourceMetadata(children, us.prefix);
		return [childrenWithMetadata, null];
	};
});

export interface GoogleDriveFolderUS {
	prefix: ResourcePrefixParser;
}
export const typeGoogleDriveFolder = defineTypeAggregateFunction(
	typeGoogleDriveRootFolder,
	({ resource }) => isFolder(resource),
	(us: GoogleDriveFolderUS) => {
		return async (resourcesWithMetadata): FetchParserPromiseReturn<ResourceWithMetadata[][]> => {
			const childrenWithMetadata: ResourceWithMetadata[][] = [];

			for (const resourceWithMetadata of resourcesWithMetadata) {
				const resource = resourceWithMetadata.resource;
				if (!isFolder(resource)) {
					return [false, null];
				}

				const [children, listError] = await listFolder(resource.id);
				if (listError) {
					return [null, listError];
				}

				childrenWithMetadata.push(parseResourceMetadata(children, us.prefix));
			}

			return [childrenWithMetadata, null];
		};
	},
);

export interface GoogleDriveImageUS {}
export const typeGoogleDriveSingleImage = defineTypeFunction(typeGoogleDriveFolder, (us: GoogleDriveImageUS) => {
	return (resourceWithMetadata): FetchParserReturn<ResourceWithMetadata> => {
		console.log(resourceWithMetadata);
		const resource = resourceWithMetadata.resource;
		if (!isImage(resource)) {
			return [false, null];
		}

		return [resourceWithMetadata, null];
	};
});

export interface GoogleDriveDocUS {}
export const typeGoogleDriveSingleDoc = defineTypeFunction(typeGoogleDriveFolder, (us: GoogleDriveDocUS) => {
	return async (resourceWithMetadata): FetchParserPromiseReturn<DocMd> => {
		const resource = resourceWithMetadata.resource;
		if (!isDoc(resource)) {
			return [false, null];
		}

		const [docMarkdown, downloadError] = await downloadDocCorrectRevisionMarkdown(resource.id);
		if (downloadError) {
			return [null, downloadError];
		}

		return [docMarkdown, null];
	};
});

export interface GoogleDriveDocWithMetadataUS {}
export const typeGoogleDriveSingleDocWithMetadata = defineTypeFunction(typeGoogleDriveSingleDoc, (us: GoogleDriveDocUS) => {
	return (docMd): FetchParserReturn<MarkdownDoc> => {
		const [markdownDoc, parseError] = parseMarkdownDocWithMetadata(docMd.docMd);
		if (parseError) {
			return [null, parseError];
		}

		return [markdownDoc, null];
	};
});

// export const typeGoogleDriveFolderAggregate = defineTypeAggregateFunction(
// 	typeGoogleDriveRootFolder,
// 	(x) => {
// 		if (isFolder(x)) {
// 			return true;
// 		}
// 		return false;
// 	},
// 	(us: GoogleDriveFolderUS) => {
// 		return (a) => {
// 			// console.log(a);
// 			const c = a.map((x) => x.name);

// 			return [c, null];
// 		};
// 	},
// );
