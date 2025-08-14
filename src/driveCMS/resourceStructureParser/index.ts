// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

/** biome-ignore-all lint/suspicious/useGuardForIn: NO EXPLANATION THIS FILE THIS CODE IS DEPRECATED */
/** biome-ignore-all lint/style/useNamingConvention: NO EXPLANATION THIS FILE THIS CODE IS DEPRECATED */

import { newTypedSymbol, TypedSymbolMap } from "@/dataStructure/index.js";
import { GOOGLE_DRIVE_PUBLIC_PREFIX } from "@/driveCMS/const.js";
import { type FolderID, type FolderResource, isFolder } from "@/driveCMS/drive.js";
import { listFolder } from "@/driveCMS/index.js";
import { doesMIMETypeMatch, MIMEType, type MIMETypeT, type MIMETypeTE, type MIMETypeToResourceType, type Resource } from "@/driveCMS/resource.js";
import type { ErrorReturnPromise } from "@/error/index.js";

import { memoizeDriveCMS } from "../cache.js";
import {
	LANGUAGE_METADATA_KEY,
	LanguageResourcePrefixParser,
	MergeResourcePrefixParser,
	OrderResourcePrefixParser,
	type ResourcePrefixParser,
	StringResourcePrefixParserFactory,
} from "./prefix.js";

const NAME_NOT_IMPORTANT_PREFIX = "CORIODERS_CHILD_DESCRIPTOR_NAME_NOT_SPECIFIED";
export const NAME_NOT_IMPORTANT = () => `${NAME_NOT_IMPORTANT_PREFIX} ${Math.random()}`;

export const PublicPrefixParser = StringResourcePrefixParserFactory(GOOGLE_DRIVE_PUBLIC_PREFIX);
export const PublicLanguagePrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser]);
export const PublicOrderedPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, OrderResourcePrefixParser]);
export const PublicLanguageOrderPrefixParser = MergeResourcePrefixParser([PublicPrefixParser, LanguageResourcePrefixParser, OrderResourcePrefixParser]);

export type FolderDescriptorChildren = { [key: string]: ChildDescriptor | ChildFolderDescriptor };
export interface ChildDescriptor<T extends MIMETypeTE = MIMETypeTE> {
	resourceType: T;

	// By default it will be set to PublicPrefixParser. That is a StringResourcePrefixParserFactory with GOOGLE_DRIVE_PUBLIC_PREFIX
	resourcePrefixParser?: ResourcePrefixParser;

	// By default it will be set to true
	required?: boolean;

	// When using NAME_NOT_IMPORTANT, there can be multiple resources with the same MIME type. Do we want to allow duplicates?
	// By default it will be set to false.
	allowDuplicateMIMETypes?: boolean;
}
export interface ChildFolderDescriptor extends ChildDescriptor {
	children: FolderDescriptorChildren;
}

function isChildFolderDescriptor(x: ChildDescriptor | ChildFolderDescriptor): x is ChildFolderDescriptor {
	return x.resourceType === MIMEType.folder;
}
export interface FolderStructureDescriptor {
	rootFolderID: FolderID;
	children: FolderDescriptorChildren;
}

export function defineFolderStructureDescriptor<T extends FolderStructureDescriptor>(fsd: T): Readonly<T> {
	return Object.freeze(fsd);
}

// // biome-ignore lint/style/useNamingConvention: <explanation>
export interface FolderStructure<FSD extends FolderStructureDescriptor> {
	rootFolder: FolderID;

	// The mapping is between child name and the child itself.
	children: TypedChildren<FSD["children"]>;
}

// TODO: This type is unholy.
export type TypedChildren<FSDChildren> = {
	[K in keyof FSDChildren]: FSDChildren[K] extends ChildDescriptor<infer ChildMIME>
		? ChildMIME extends MIMETypeT["folder"]
			? FolderChild<Extract<FSDChildren[K], ChildFolderDescriptor>["children"]>
			: Child<ChildMIME>
		: never;
};

export type ChildMetadata = TypedSymbolMap;
export interface Child<T extends MIMETypeTE = MIMETypeTE> {
	// parentFolder: FolderResource;
	resource: MIMETypeToResourceType<T>;

	metadata: ChildMetadata;
}

const RESOURCE_NAME_WITHOUT_PREFIX_METADATA_KEY = newTypedSymbol("NAME_WITHOUT_PREFIX_METADATA_KEY");
export interface FolderChild<FolderChildren> extends Child {
	resource: FolderResource;

	// The mapping is between child name and the child itself.
	children: TypedChildren<FolderChildren>;
}

export function isFolderChild<T>(x: Child | FolderChild<T>): x is FolderChild<T> {
	return isFolder(x.resource);
}

export interface FetchAndParseFolderStructureOptions {
	lang?: string;
}

export const fetchAndParseFolderStructure = memoizeDriveCMS(async function fetchAndParseFolderStructure<T extends FolderStructureDescriptor>(
	fsd: T,
	options?: FetchAndParseFolderStructureOptions,
): ErrorReturnPromise<FolderStructure<T>> {
	// const error = validateFolderStructureDescriptor(fsd);
	// if (error) {
	// 	return [null, error];
	// }

	const language: string | undefined = options?.lang?.toUpperCase();

	const rootFolder: FolderResource = {
		id: fsd.rootFolderID,
		mimeType: "application/vnd.google-apps.folder",
		name: "<ROOT FOLDER -- NO NAME>",
	};

	const [rootFolderList, errorLisRootFolder] = await listFolder(fsd.rootFolderID);
	if (errorLisRootFolder) {
		return [null, new Error("Unable to list root folder")];
	}

	const fs = {
		children: {},
		rootFolder: fsd.rootFolderID,
	};
	const errors = await fetchAndParseChildStructure(fs.children, rootFolder, rootFolderList, fsd.children, language);
	if (errors) {
		const errorMessages = errors.map((x) => x.message);
		const joinedErrorMessages = errorMessages.join("\n");
		return [null, new AggregateError(errors, `Unable to parse and fetch folder:\n ${joinedErrorMessages}`, { cause: errors })];
	}

	return [fs as FolderStructure<T>, null];
});

// // biome-ignore lint/correctness/noUnusedVariables: <explanation>
// function validateFolderStructureDescriptor(fsd: FolderStructureDescriptor): Error | null {
// 	if (fsd.rootFolderID === undefined) {
// 		return new Error('rootFolderID is undefined');
// 	}

// 	if (fsd.children === undefined) {
// 		return new Error('children is undefined');
// 	}

// 	for (const childName in fsd.children) {
// 		const child = fsd.children[childName] as Required<(typeof fsd.children)[typeof childName]>;
// 		const error = validateChildDescriptor(child);
// 		if (error) {
// 			return error;
// 		}
// 	}

// 	return null;
// }

// function validateChildDescriptor(childDescriptor: ChildDescriptor | ChildFolderDescriptor): Error | null {
// 	if (childDescriptor.resourceType === undefined) {
// 		return new Error('resourceType is undefined');
// 	}

// 	if (isChildFolderDescriptor(childDescriptor)) {
// 		if (childDescriptor.children === undefined) {
// 			return new Error('children is undefined');
// 		}

// 		const childNames = new Set<string>();
// 		const childMIMETypes = new Set<MIMETypeTE>();
// 		for (const childName in childDescriptor.children) {
// 			const child = childDescriptor.children[childName] as Required<(typeof childDescriptor.children)[typeof childName]>;

// 			if (childNames.has(childName)) {
// 				return new Error(`Duplicate child name ${childName}`);
// 			}
// 			childNames.add(childName);

// 			if (childMIMETypes.has(child.resourceType)) {
// 				return new Error(
// 					`Duplicate child MIME type ${(childDescriptor.children[childName] as Required<(typeof childDescriptor.children)[typeof childName]>).resourceType}`,
// 				);
// 			}
// 			childMIMETypes.add(child.resourceType);

// 			const error = validateChildDescriptor(child);
// 			if (error) {
// 				return error;
// 			}
// 		}
// 	}

// 	return null;
// }

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
async function fetchAndParseChildStructure<T>(
	fsChildren: Record<string, Child | FolderChild<T>>,
	parentFolder: FolderResource,
	childrenResources: Resource[],
	childrenDescriptor: FolderDescriptorChildren,
	language?: string,
): Promise<Error[] | null> {
	const errors: Error[] = [];

	for (const childDescriptorName in childrenDescriptor) {
		const childDescriptor = childrenDescriptor[childDescriptorName] as Required<(typeof childrenDescriptor)[typeof childDescriptorName]>;

		// If the name is not important we can match multiple children.
		const nameNotImportant = childDescriptorName.includes(NAME_NOT_IMPORTANT_PREFIX);

		const computedResourcePrefixParser = childDescriptor.resourcePrefixParser ?? PublicPrefixParser;
		const computedRequired = childDescriptor.required ?? true;
		const computedAllowDuplicateMIMETypes = childDescriptor.allowDuplicateMIMETypes ?? false;

		let found = false;
		const childrenMatchedToThisChildDescriptor: Child[] = [];
		for (const childResource of childrenResources) {
			const childMetadata = new TypedSymbolMap();

			const resourceNameWithoutPrefix = computedResourcePrefixParser.parser(childResource.name, childMetadata);
			if (!resourceNameWithoutPrefix) {
				continue;
			}

			const setError = childMetadata.setEntry(RESOURCE_NAME_WITHOUT_PREFIX_METADATA_KEY, resourceNameWithoutPrefix);
			if (setError) {
				errors.push(setError);
				continue;
			}

			// ==================================================
			// TODO: This is hacky. We need to find a better way to do this.

			const languageMetadata = childMetadata.getEntry(LANGUAGE_METADATA_KEY);
			if (languageMetadata && language) {
				if (language !== languageMetadata) {
					continue;
				}
			}

			// ==================================================

			if (nameNotImportant) {
				if (!doesMIMETypeMatch(childDescriptor.resourceType, childResource.mimeType)) {
					continue;
				}

				found = true;
				const child = {
					metadata: childMetadata,
					// parentFolder: parentFolder,
					resource: childResource as MIMETypeToResourceType<typeof childResource.mimeType>,
				};
				childrenMatchedToThisChildDescriptor.push(child);
				fsChildren[resourceNameWithoutPrefix] = child;
				continue;
			}

			if (resourceNameWithoutPrefix !== childDescriptorName) {
				continue;
			}

			if (!doesMIMETypeMatch(childDescriptor.resourceType, childResource.mimeType)) {
				errors.push(
					new Error(
						`Within '${parentFolder.name}'. Resource with a name ${childResource.name} was found, but the type of the resource does not match the expected type. Expected type ${childDescriptor.resourceType}, current type: ${childResource.mimeType}`,
					),
				);
				continue;
			}

			if (fsChildren[resourceNameWithoutPrefix] !== undefined) {
				errors.push(
					new Error(
						`Within '${parentFolder.name}'. Resource with a name "${resourceNameWithoutPrefix}" and type ${childResource.mimeType} was found twice. No duplicates are allowed. Note that the prefix is striped.`,
					),
				);
				continue;
			}

			found = true;
			const child = {
				metadata: childMetadata,
				// parentFolder: parentFolder,
				resource: childResource as MIMETypeToResourceType<typeof childResource.mimeType>,
			};
			childrenMatchedToThisChildDescriptor.push(child);
			fsChildren[resourceNameWithoutPrefix] = child;
		}

		if (!found && computedRequired) {
			let help = "";
			const prefixParserHelp = computedResourcePrefixParser.userErrorMessage ?? "";
			if (prefixParserHelp) {
				help = `\n\nPrefix parser help: ${prefixParserHelp}`;
			}

			if (nameNotImportant) {
				errors.push(
					new Error(
						`Within '${parentFolder.name}'. Missing required child with prefix "${computedResourcePrefixParser.userErrorPrefixTemplate}" and type ${childDescriptor.resourceType} ${help}`,
					),
				);
			} else {
				errors.push(
					new Error(
						`Within '${parentFolder.name}'. Missing required child with name "${computedResourcePrefixParser.userErrorPrefixTemplate} ${childDescriptorName}" and type ${childDescriptor.resourceType} ${help}`,
					),
				);
			}
			continue;
		}

		if (!computedAllowDuplicateMIMETypes) {
			const mimeTypesFound = new Set<string>();
			for (const child of childrenMatchedToThisChildDescriptor) {
				if (mimeTypesFound.has(child.resource.mimeType)) {
					errors.push(
						new Error(
							`Within '${parentFolder.name}'. Resource of type ${child.resource.mimeType} was found twice. No duplicate types are allowed. Resource name: ${child.resource.name}`,
						),
					);
					continue;
				}

				mimeTypesFound.add(child.resource.mimeType);
			}
		}

		// Handle recursive case.
		if (!isChildFolderDescriptor(childDescriptor)) {
			continue;
		}

		for (const child of childrenMatchedToThisChildDescriptor) {
			if (!isFolder(child.resource)) {
				errors.push(new Error(`Within '${parentFolder.name}'. This should NOT happen! We have the childDescriptor, but the resource is not a folder`));
				continue;
			}

			if (!isFolderChild(child)) {
				errors.push(new Error(`Within '${parentFolder.name}'. This should NOT happen! We have the childDescriptor, but the resource is not a folder`));
				continue;
			}

			const [googleChildren, googleChildrenListError] = await listFolder(child.resource.id);
			if (googleChildrenListError) {
				errors.push(new Error(`Within '${parentFolder.name}'. Unable to list a folder with name ${child.resource.name} and id ${child.resource.id}`));
				continue;
			}

			if (!child.children) {
				child.children = {} as TypedChildren<T>;
			}

			const recursiveErrors = await fetchAndParseChildStructure(child.children, child.resource, googleChildren, childDescriptor.children, language);
			if (recursiveErrors) {
				errors.push(...recursiveErrors);
			}
		}
	}

	if (errors.length === 0) {
		return null;
	}

	return errors;
}

export function getChildByMIMEType<T extends MIMETypeTE, A>(fsChildren: Record<string, Child | FolderChild<A>>, mimeType: T): Child<T> | null {
	for (const childName in fsChildren) {
		const child = fsChildren[childName] as Required<(typeof fsChildren)[typeof childName]>;
		if (doesMIMETypeMatch(mimeType, child.resource.mimeType)) {
			return child as Child<T>;
		}
	}

	return null;
}

export function getAllChildrenByMIMEType<T extends MIMETypeTE, A>(fsChildren: Record<string, Child | FolderChild<A>>, mimeType: T): Child<T>[] {
	const children: Child<T>[] = [];

	for (const childName in fsChildren) {
		const child = fsChildren[childName] as Required<(typeof fsChildren)[typeof childName]>;
		if (doesMIMETypeMatch(mimeType, child.resource.mimeType)) {
			children.push(child as Child<T>);
		}
	}

	return children;
}
