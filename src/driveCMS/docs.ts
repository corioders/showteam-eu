// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import type { TxtDocumentNode } from '@textlint/ast-node-types';
import { parse } from '@textlint/markdown-to-ast';
import type { GoogleAuth } from 'googleapis-common';

import { CSE, type ErrorReturnPromise } from '@/error';
import memoize from 'memoize';
import { type FileID, MIMEType, type Resource, type Revision, type RevisionID, downloadFile, getRevisionsFromUndocumentedAPI } from './drive.js';

export type DocID = FileID & { readonly __docTag: unique symbol };

export const ERR_DOC_ID_EMPTY = new Error('Doc ID cannot be empty');
export function validateDocID(docID: DocID): Error | null {
	if (docID === '' || !docID) {
		return new CSE(ERR_DOC_ID_EMPTY);
	}

	return null;
}

export interface DocResource extends Resource {
	id: DocID;
	mimeType: (typeof MIMEType)['docs'];
}

export function isDoc(resource: Resource): resource is DocResource {
	return resource.mimeType === MIMEType.docs;
}

export interface DocMd {
	docMd: string;

	docID: DocID;
}

export const ERR_EXPECTED_DOWNLOADED_DOC_STRING = new Error('Expected the downloaded doc to be a string. Because MIME type of markdown was provided.');
export const downloadDocMarkdownRevision = memoize(async function downloadDocMarkdownRevision(
	googleAuth: GoogleAuth,
	docID: DocID,
	revisionID: RevisionID,
): ErrorReturnPromise<DocMd> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [docAsMarkdown, errorDownloadFile] = await downloadFile(googleAuth, docID, revisionID, MIMEType.markdown);
	if (errorDownloadFile !== null) {
		return [null, errorDownloadFile];
	}

	if (typeof docAsMarkdown !== 'string') {
		return [null, new CSE(ERR_EXPECTED_DOWNLOADED_DOC_STRING)];
	}

	const doc: DocMd = {
		docMd: docAsMarkdown,

		docID: docID,
	};

	return [doc, null];
});

export interface Doc {
	docAST: TxtDocumentNode;

	docID: DocID;
}

export const downloadDocRevision = memoize(async function downloadDocRevision(googleAuth: GoogleAuth, docID: DocID, revisionID: RevisionID): ErrorReturnPromise<Doc> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [docAsMarkdown, errorDownloadFile] = await downloadFile(googleAuth, docID, revisionID, MIMEType.markdown);
	if (errorDownloadFile !== null) {
		return [null, errorDownloadFile];
	}

	if (typeof docAsMarkdown !== 'string') {
		return [null, new CSE(ERR_EXPECTED_DOWNLOADED_DOC_STRING)];
	}

	try {
		const docAsMarkdownAST = parse(docAsMarkdown);
		const doc: Doc = {
			docAST: docAsMarkdownAST,

			docID: docID,
		};

		return [doc, null];
	} catch (error) {
		return [null, new Error('@textlint/markdown-to-ast parse failed', { cause: error })];
	}
});

export const getDocRevisions = memoize(async function getDocRevisions(googleAuth: GoogleAuth, docID: DocID): ErrorReturnPromise<Revision[]> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [revisions, err] = await getRevisionsFromUndocumentedAPI(
		googleAuth,
		`https://docs.google.com/document/d/${docID}/revisions/tiles?id=${docID}&start=1&revisionBatchSize=1500&showDetailedRevisions=false&loadType=0&includes_info_params=true&cros_files=false`,
	);
	if (err !== null) {
		return [null, err];
	}

	return [revisions, null];
});
