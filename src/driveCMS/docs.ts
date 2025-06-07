// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import type { TxtDocumentNode } from '@textlint/ast-node-types';
import { parse } from '@textlint/markdown-to-ast';
import { type GaxiosPromise, type GoogleAuth, createAPIRequest } from 'googleapis-common';

import { CSE, type ErrorReturn, type ErrorReturnPromise, UnreachableErrorMessage, safePromise } from '@/error';
import type { ImageURL } from '@/media/image/index.js';
import { StatusCodes } from 'http-status-codes';
import { memoizeDriveCMS } from './cache.js';
import { type FileID, type Revision, type RevisionID, downloadFile, getRevisionsFromUndocumentedAPI } from './drive.js';
import { MIMEType, type MIMETypeT, type Resource } from './resource.js';

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
	mimeType: MIMETypeT['docs'];
}

export function isDoc(resource: Resource): resource is DocResource {
	return resource.mimeType === MIMEType.docs;
}

export interface DocMd {
	docMd: string;
	docID: DocID;
}

export const ERR_EXPECTED_DOWNLOADED_DOC_STRING = new Error('Expected the downloaded doc to be a string. Because MIME type of markdown was provided.');
export const downloadDocMarkdownRevision = memoizeDriveCMS(async function downloadDocMarkdownRevision(
	googleAuth: GoogleAuth,
	docID: DocID,
	revisionID: RevisionID,
): ErrorReturnPromise<DocMd> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [docAsMarkdown, errorDownload] = await baseDownloadDocRevisionAndAdjustInDocMarkdownImages(googleAuth, docID, revisionID);
	if (errorDownload !== null) {
		return [null, errorDownload];
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

export const downloadDocRevision = memoizeDriveCMS(async function downloadDocRevision(
	googleAuth: GoogleAuth,
	docID: DocID,
	revisionID: RevisionID,
): ErrorReturnPromise<Doc> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [docAsMarkdown, errorDownload] = await baseDownloadDocRevisionAndAdjustInDocMarkdownImages(googleAuth, docID, revisionID);
	if (errorDownload !== null) {
		return [null, errorDownload];
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

const MARKDOWN_IMAGE_REGEX = /!\[\]\[image\d+\]/;
const IMAGE_BASE64_MARKDOWN_DEFINITION_AT_THE_END = '[image1]: <data:image/';
export async function baseDownloadDocRevisionAndAdjustInDocMarkdownImages(googleAuth: GoogleAuth, docID: DocID, revisionID: RevisionID): ErrorReturnPromise<string> {
	const [docAsMarkdown, errorDownloadFile] = await downloadFile(googleAuth, docID, revisionID, MIMEType.markdown);
	if (errorDownloadFile !== null) {
		return [null, errorDownloadFile];
	}

	if (typeof docAsMarkdown !== 'string') {
		return [null, new CSE(ERR_EXPECTED_DOWNLOADED_DOC_STRING)];
	}

	// ==================================================
	// Download and parse metadata used to adjust image URLs
	const [webSource, errorGetWebSource] = await UNDOCUMENTEDapiDownloadDocWebInterfaceHtmlPage(googleAuth, docID);
	if (errorGetWebSource !== null) {
		return [null, errorGetWebSource];
	}

	const [photoIDAndImageURL, errorGetInternalPhotoIDAndImageURL] = getGoogleInternalPhotoIDtoImageURLArray(webSource);
	if (errorGetInternalPhotoIDAndImageURL !== null) {
		return [null, errorGetInternalPhotoIDAndImageURL];
	}

	// No photos found
	if (photoIDAndImageURL.length === 0) {
		return [docAsMarkdown, null];
	}

	const [sortedPhotoIDAndImageURL, errorSort] = sortPhotoIDAndImageURLArrayBasedOnDocOrder(webSource, photoIDAndImageURL);
	if (errorSort !== null) {
		return [null, errorSort];
	}

	// ==================================================

	// ==================================================
	// Adjust image URLs
	let docAsMarkdownAdjusted = docAsMarkdown;

	const imageURLs = sortedPhotoIDAndImageURL.map((photoIDAndImageURL) => photoIDAndImageURL.url);
	for (const imageURL of imageURLs) {
		// TODO: The alt text can be 99% extracted from the metadata.
		docAsMarkdownAdjusted = docAsMarkdownAdjusted.replace(MARKDOWN_IMAGE_REGEX, `![TODO_ALT_TEXT](${imageURL})`);
	}

	// ==================================================
	// Remove base64 encoded definitions form the markdown
	const imageBase64Definitions = docAsMarkdownAdjusted.indexOf(IMAGE_BASE64_MARKDOWN_DEFINITION_AT_THE_END);
	if (imageBase64Definitions === -1) {
		return [null, new Error(UnreachableErrorMessage('Unable to find image base64 definitions in the markdown'))];
	}

	docAsMarkdownAdjusted = docAsMarkdownAdjusted.slice(0, imageBase64Definitions - 1);
	// ==================================================

	return [docAsMarkdownAdjusted, null];
}

export const getDocRevisions = memoizeDriveCMS(async function getDocRevisions(googleAuth: GoogleAuth, docID: DocID): ErrorReturnPromise<Revision[]> {
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

type GoogleInternalPhotoID = string & { readonly __googleInternalPhotoIDTag: unique symbol };
type GoogleInternalWebInterfacePageSource = string & { readonly __googleInternalWebInterfacePageSourceTag: unique symbol };
interface GoogleInternalPhotoIDAndImageURL {
	id: GoogleInternalPhotoID;
	url: ImageURL;
}

const DOCS_MODEL_CHUNK_START_STRING = '>DOCS_modelChunk = ';
const DOCS_MODEL_CHUNK_END_STRING = '; DOCS_modelChunkLoadStart ';
function sortPhotoIDAndImageURLArrayBasedOnDocOrder(
	source: GoogleInternalWebInterfacePageSource,
	array: GoogleInternalPhotoIDAndImageURL[],
): ErrorReturn<GoogleInternalPhotoIDAndImageURL[]> {
	const copyArray: GoogleInternalPhotoIDAndImageURL[] = array.slice();

	const searchStartIndex = source.indexOf(DOCS_MODEL_CHUNK_START_STRING);
	if (searchStartIndex === -1) {
		return [null, new Error(UnreachableErrorMessage('Google changed something: Unable to find searchStartIndex'))];
	}

	const searchEndIndex = source.indexOf(DOCS_MODEL_CHUNK_END_STRING);
	if (searchEndIndex === -1) {
		return [null, new Error(UnreachableErrorMessage('Google changed something: Unable to find searchEndIndex'))];
	}

	// biome-ignore lint/style/useNamingConvention: <explanation>
	const DOCS_modelChunkString = source.slice(searchStartIndex + DOCS_MODEL_CHUNK_START_STRING.length, searchEndIndex);
	// biome-ignore lint/style/useNamingConvention: <explanation>
	const DOCS_modelChunk = JSON.parse(DOCS_modelChunkString);

	// kix is an ID used to mark every "entity" on the docs page. Paragraph, image, etc...
	// spi is an indication where on page is this specific entity.
	// We have to map GoogleInternalPhotoID to kixID and then sort these kixID by SPI.
	const kixIDtoSPI = new Map<string, number>();
	const photoIDtoKixID = new Map<string, string>();
	for (const chunk of DOCS_modelChunk) {
		if (chunk.spi) {
			kixIDtoSPI.set(chunk.id, chunk.spi);
		}

		// this is where the photoID is stored
		const iCid = chunk.epm?.ee_eo?.i_cid;
		if (iCid) {
			photoIDtoKixID.set(iCid, chunk.id);
		}
	}

	let mapError: Error | null = null;
	const arrayWithIndexInSource = copyArray.map((photoIDAndImageURL) => {
		const kixID = photoIDtoKixID.get(photoIDAndImageURL.id);
		if (!kixID) {
			mapError = new Error(UnreachableErrorMessage(`Google changed something: Unable to find photo ID ${photoIDAndImageURL.id} in kixIDtoSPI`));
		}

		const spi = kixIDtoSPI.get(kixID);
		if (!spi) {
			mapError = new Error(UnreachableErrorMessage(`Google changed something: Unable to find kixID ${kixID} in kixIDtoSPI`));
		}
		const sortNumber = spi;

		return { ...photoIDAndImageURL, sortNumber };
	});
	if (mapError) {
		return [null, mapError];
	}

	const sortedArrayWithIndexInSource = arrayWithIndexInSource.sort((a, b) => a.sortNumber - b.sortNumber);
	const sortedArray = sortedArrayWithIndexInSource.map((photoIDAndImageURL) => ({ id: photoIDAndImageURL.id, url: photoIDAndImageURL.url }));
	return [sortedArray, null];
}

const COMMON_URL_PART = 'https://lh7-rt.googleusercontent.com/docsz/';
const URL_START_INDEX_TO_ID_END_INDEX_OFFSET = 4;
function getGoogleInternalPhotoIDtoImageURLArray(source: GoogleInternalWebInterfacePageSource): ErrorReturn<GoogleInternalPhotoIDAndImageURL[]> {
	const photoIDAndImageURL: GoogleInternalPhotoIDAndImageURL[] = [];

	let urlSearchStart = 0;
	while (true) {
		const urlStartIndex = source.indexOf(COMMON_URL_PART, urlSearchStart);
		if (urlStartIndex === -1) {
			break;
		}

		const endQuoteIndex = source.indexOf(`"`, urlStartIndex);
		urlSearchStart = endQuoteIndex;

		const escapedURL = source.slice(urlStartIndex, endQuoteIndex);
		if (!escapedURL) {
			return [null, new Error(UnreachableErrorMessage('Google changed something: We matched urlStartIndex and endQuoteIndex, but escapedURL is empty...'))];
		}

		// We are replacing the escaped equal sign, with a real one. I don't think pulling a whole lib to do just this is necessary.
		const decodedURL = escapedURL.replace('\\u003d', '=') as ImageURL;

		const photoIDEndIndex = urlStartIndex - URL_START_INDEX_TO_ID_END_INDEX_OFFSET;
		const photoIDStartIndex = source.lastIndexOf(`"`, photoIDEndIndex);

		// We need to shift one to the right because we are off one.
		const photoID = source.slice(photoIDStartIndex + 1, photoIDEndIndex + 1) as GoogleInternalPhotoID;
		if (!photoID) {
			return [null, new Error(UnreachableErrorMessage('Google changed something: We matched photoIDStartIndex and photoIDEndIndex, but photoID is empty...'))];
		}

		photoIDAndImageURL.push({
			id: photoID,
			url: decodedURL,
		});
	}

	return [photoIDAndImageURL, null];
}

async function UNDOCUMENTEDapiDownloadDocWebInterfaceHtmlPage(googleAuth: GoogleAuth, docID: DocID): ErrorReturnPromise<GoogleInternalWebInterfacePageSource> {
	const undocumentedDownloadURL = `https://docs.google.com/document/d/${docID}/edit`;

	const [response, errorGaxios] = await safePromise(() => {
		return createAPIRequest({
			options: {
				url: undocumentedDownloadURL,
				method: 'GET',
			},
			params: {},
			requiredParams: [],
			pathParams: [],
			context: { _options: { auth: googleAuth } },
		}) as GaxiosPromise<string>;
	});

	if (errorGaxios !== null) {
		return [null, new Error(`Gaxios API request failed: ${errorGaxios}`, { cause: errorGaxios })];
	}

	if (response.status !== StatusCodes.OK) {
		return [null, new Error(`Gaxios API request failed: status code is not 200: ${response.status}`)];
	}

	if (!response.data) {
		return [null, new Error('Gaxios API request failed: response.data is empty')];
	}

	return [response.data as GoogleInternalWebInterfacePageSource, null];
}
