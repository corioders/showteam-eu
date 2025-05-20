// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

import type { ErrorReturnPromise } from '@/error/index.js';
import { GOOGLE_DRIVE_PUBLIC_PREFIX } from './const.js';
import { type FolderID, type FolderResource, isFolder } from './drive.js';
import { listFolder } from './index.js';
import { MIMEType, type MIMETypeT, type MIMETypeTE, type MIMETypeToResourceType, type Resource, doesMIMETypeMatch } from './resource.js';

const NAME_NOT_IMPORTANT_PREFIX = 'CORIODERS_CHILD_DESCRIPTOR_NAME_NOT_SPECIFIED';
export const NAME_NOT_IMPORTANT = () => `${NAME_NOT_IMPORTANT_PREFIX} ${Math.random()}`;
export interface ChildDescriptor<T extends MIMETypeTE = MIMETypeTE> {
	resourceType: T;

	// By default it will be set to GOOGLE_DRIVE_PUBLIC_PREFIX
	resourceNamePrefix?: string;

	// By default it will be set to true
	required?: boolean;

	// When using NAME_NOT_IMPORTANT, there can be multiple resources with the same MIME type. Do we want to allow duplicates?
	// By default it will be set to false.
	allowDuplicateMIMETypes?: boolean;
}

export type FolderDescriptorChildren = { [key: string]: ChildDescriptor | ChildFolderDescriptor };

export interface ChildFolderDescriptor extends ChildDescriptor {
	resourceType: MIMETypeT['folder'];
	children: FolderDescriptorChildren;
}

function isChildFolderDescriptor(x: ChildDescriptor | ChildFolderDescriptor): x is ChildFolderDescriptor {
	return x.resourceType === MIMEType.folder;
}

export interface FolderStructureDescriptor {
	rootFolderID: FolderID;
	children: FolderDescriptorChildren;
}

// biome-ignore lint/style/useNamingConvention: <explanation>
export interface FolderStructure<FSD extends FolderStructureDescriptor> {
	rootFolder: FolderID;

	// The mapping is between child name and the child itself.
	children: FolderStructureTypedChildren<FSD['children']>;
}

// TODO: Better types
type FolderStructureTypedChildren<FSDChildren> = {
	[K in keyof FSDChildren]: FSDChildren[K] extends ChildDescriptor<infer ChildMIME>
		? ChildMIME extends MIMETypeT['folder']
			? FolderChild
			: Child<ChildMIME>
		: FSDChildren[K] extends ChildFolderDescriptor
			? FolderChild
			: never;
};

export interface Child<T extends MIMETypeTE = MIMETypeTE> {
	// parentFolder: FolderResource;
	resource: MIMETypeToResourceType<T>;
}

export interface FolderChild extends Child {
	resource: FolderResource;

	// The mapping is between child name and the child itself.
	children: { [key: string]: Child | FolderChild };
}

function isFolderChild(x: Child): x is FolderChild {
	return isFolder(x.resource);
}

export async function fetchAndParseFolderStructure<T extends FolderStructureDescriptor>(fsd: T): ErrorReturnPromise<FolderStructure<T>> {
	const error = validateFolderStructureDescriptor(fsd);
	if (error) {
		return [null, error];
	}

	const rootFolder: FolderResource = {
		id: fsd.rootFolderID,
		mimeType: 'application/vnd.google-apps.folder',
		name: '<ROOT FOLDER -- NO NAME>',
	};

	const [rootFolderList, errorLisRootFolder] = await listFolder(fsd.rootFolderID);
	if (errorLisRootFolder) {
		return [null, new Error('Unable to list root folder')];
	}

	const fs = {
		rootFolder: fsd.rootFolderID,
		children: {},
	};
	const errors = await fetchAndParseChildStructure(fs.children, rootFolder, rootFolderList, fsd.children);
	if (errors) {
		const errorMessages = errors.map((x) => x.message);
		const joinedErrorMessages = errorMessages.join('\n');
		return [null, new AggregateError(errors, `Unable to parse and fetch folder:\n ${joinedErrorMessages}`, { cause: errors })];
	}

	return [fs as FolderStructure<T>, null];
}

function validateFolderStructureDescriptor(fsd: FolderStructureDescriptor): Error | null {
	if (fsd.rootFolderID === undefined) {
		return new Error('rootFolderID is undefined');
	}

	if (fsd.children === undefined) {
		return new Error('children is undefined');
	}

	for (const childName in fsd.children) {
		const child = fsd.children[childName];
		const error = validateChildDescriptor(child);
		if (error) {
			return error;
		}
	}
}

function validateChildDescriptor(childDescriptor: ChildDescriptor | ChildFolderDescriptor): Error | null {
	if (childDescriptor.resourceType === undefined) {
		return new Error('resourceType is undefined');
	}

	if (isChildFolderDescriptor(childDescriptor)) {
		if (childDescriptor.children === undefined) {
			return new Error('children is undefined');
		}

		const childNames = new Set<string>();
		const childMIMETypes = new Set<MIMETypeTE>();
		for (const childName in childDescriptor.children) {
			const child = childDescriptor.children[childName];

			if (childNames.has(childName)) {
				return new Error(`Duplicate child name ${childName}`);
			}
			childNames.add(childName);

			if (childMIMETypes.has(child.resourceType)) {
				return new Error(`Duplicate child MIME type ${childDescriptor.children[childName].resourceType}`);
			}
			childMIMETypes.add(child.resourceType);

			const error = validateChildDescriptor(child);
			if (error) {
				return error;
			}
		}
	}
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
async function fetchAndParseChildStructure(
	fsChildren: Record<string, Child | FolderChild>,
	parentFolder: FolderResource,
	children: Resource[],
	childrenDescriptor: FolderDescriptorChildren,
): Promise<Error[] | null> {
	const errors: Error[] = [];

	for (const childName in childrenDescriptor) {
		const childDescriptor = childrenDescriptor[childName];

		// If the name is not important we can match multiple children.
		const nameNotImportant = childName.includes(NAME_NOT_IMPORTANT_PREFIX);
		const computedNamePrefix = childDescriptor.resourceNamePrefix ?? GOOGLE_DRIVE_PUBLIC_PREFIX;
		const computedChildName = `${computedNamePrefix} ${childName}`;
		const computedRequired = childDescriptor.required ?? true;
		const computedAllowDuplicateMIMETypes = childDescriptor.allowDuplicateMIMETypes ?? false;

		let found = false;
		const resourcesMatchedToThisChildDescriptor: Resource[] = [];
		for (const child of children) {
			if (nameNotImportant) {
				if (!child.name.startsWith(computedNamePrefix)) {
					continue;
				}

				if (!doesMIMETypeMatch(childDescriptor.resourceType, child.mimeType)) {
					continue;
				}

				found = true;
				resourcesMatchedToThisChildDescriptor.push(child);
				fsChildren[child.name] = {
					// parentFolder: parentFolder,
					resource: child as MIMETypeToResourceType<typeof child.mimeType>,
				};
				continue;
			}

			if (child.name !== computedChildName) {
				continue;
			}

			if (!doesMIMETypeMatch(childDescriptor.resourceType, child.mimeType)) {
				errors.push(
					new Error(
						`Within '${parentFolder}'. Resource with a name ${child.name} was found, but the type of the resource does not match the expected type. Expected type ${childDescriptor.resourceType}, current type: ${child.mimeType}`,
					),
				);
				continue;
			}

			if (fsChildren[child.name] !== undefined) {
				errors.push(new Error(`Within '${parentFolder}'. Resource with a name ${child.name} and type ${child.mimeType} was found twice. No duplicates are allowed.`));
				continue;
			}

			found = true;
			resourcesMatchedToThisChildDescriptor.push(child);
			fsChildren[child.name] = {
				// parentFolder: parentFolder,
				resource: child as MIMETypeToResourceType<typeof child.mimeType>,
			};
		}

		if (!found && computedRequired) {
			if (nameNotImportant) {
				errors.push(new Error(`Within '${parentFolder.name}'. Missing required child with prefix ${computedNamePrefix} and type ${childDescriptor.resourceType}`));
			} else {
				errors.push(new Error(`Within '${parentFolder.name}'. Missing required child with name ${computedChildName} and type ${childDescriptor.resourceType}`));
			}
			continue;
		}

		if (!computedAllowDuplicateMIMETypes) {
			const mimeTypesFound = new Set<string>();
			for (const resource of resourcesMatchedToThisChildDescriptor) {
				if (mimeTypesFound.has(resource.mimeType)) {
					errors.push(
						new Error(
							`Within '${parentFolder.name}'. Resource of type ${resource.mimeType} was found twice. No duplicate types are allowed. Resource name: ${resource.name}`,
						),
					);
					continue;
				}

				mimeTypesFound.add(resource.mimeType);
			}
		}

		// Handle recursive case.
		if (!isChildFolderDescriptor(childDescriptor)) {
			continue;
		}

		for (const resource of resourcesMatchedToThisChildDescriptor) {
			if (!isFolder(resource)) {
				errors.push(new Error(`Within '${parentFolder.name}'. This should NOT happen! We have the correct childDescriptor, but the resource is not a folder`));
				continue;
			}

			const [children, childrenListError] = await listFolder(resource.id);
			if (childrenListError) {
				errors.push(new Error(`Within '${parentFolder.name}'. Unable to list a folder with name ${resource.name} and id ${resource.id}`));
			}

			const child = fsChildren[resource.name];
			if (!isFolderChild(child)) {
				errors.push(new Error(`Within '${parentFolder.name}'. This should NOT happen! We have the correct childDescriptor, but the resource is not a folder`));
				continue;
			}

			if (!child.children) {
				child.children = {};
			}

			const recursiveErrors = await fetchAndParseChildStructure(child.children, resource, children, childDescriptor.children);
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

// TODO: Better types
export function getChildByMIMEType<T extends MIMETypeTE>(fsChildren: Record<string, Child | FolderChild>, mimeType: T): Child<T> | null {
	for (const childName in fsChildren) {
		const child = fsChildren[childName];
		if (doesMIMETypeMatch(mimeType, child.resource.mimeType)) {
			return child as Child<T>;
		}
	}

	return null;
}
