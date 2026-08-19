// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

import type { TxtDocumentNode } from "@textlint/ast-node-types";
import { parse } from "@textlint/markdown-to-ast";
import { createAPIRequest, type GoogleAuth } from "googleapis-common";
import { StatusCodes } from "http-status-codes";

import { CSE, type ErrorReturn, type ErrorReturnPromise, errorIsInArray, safe, safePromise, unreachableErrorMessage } from "@/error";
import type { StringMarkdown } from "@/format/markdown/index.js";
import type { ImageURL } from "@/media/image/index.js";

import { memoizeDriveCMS, type PersistentCacheController, persistentDriveCMSCache } from "./cache.js";
import { downloadFile, type FileID, getRevisionsFromUndocumentedAPIPersistentCached, type Revision, type RevisionID } from "./drive.js";
import { MIMEType, type MIMETypeT, type Resource } from "./resource.js";

export type DocID = FileID & { readonly __docTag: unique symbol };

export const ERR_DOC_ID_EMPTY = new Error("Doc ID cannot be empty");
export function validateDocID(docID: DocID): Error | null {
	if (docID === "" || !docID) {
		return new CSE(ERR_DOC_ID_EMPTY);
	}

	return null;
}

export interface DocResource extends Resource {
	id: DocID;
	mimeType: MIMETypeT["docs"];
}

export function isDoc(resource: Resource): resource is DocResource {
	return resource.mimeType === MIMEType.docs;
}

export interface DocMd {
	docMd: StringMarkdown;
	docID: DocID;
}

export const ERR_EXPECTED_DOWNLOADED_DOC_STRING = new Error("Expected the downloaded doc to be a string. Because MIME type of markdown was provided.");
export const downloadDocMarkdownRevision = memoizeDriveCMS(async function downloadDocMarkdownRevision(
	googleAuth: GoogleAuth,
	docID: DocID,
	revisionID: RevisionID,
): ErrorReturnPromise<DocMd> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [docAsMarkdown, errorDownload] = await baseDownloadDocRevisionAndAdjustInDocMarkdownImagesPersistentCached(googleAuth, docID, revisionID);
	if (errorDownload !== null) {
		return [null, errorDownload];
	}

	const doc: DocMd = {
		docID: docID,
		docMd: docAsMarkdown as StringMarkdown,
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

	const [docAsMarkdown, errorDownload] = await baseDownloadDocRevisionAndAdjustInDocMarkdownImagesPersistentCached(googleAuth, docID, revisionID);
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
		return [null, new Error("@textlint/markdown-to-ast parse failed", { cause: error })];
	}
});

const MARKDOWN_IMAGE_REGEX = /!\[\]\[image\d+\]/;
const IMAGE_BASE64_MARKDOWN_DEFINITION_AT_THE_END = "[image1]: <data:image/";

export const baseDownloadDocRevisionAndAdjustInDocMarkdownImagesPersistentCached: (
	googleAuth: GoogleAuth,
	docID: DocID,
	revisionID: RevisionID,
) => ErrorReturnPromise<StringMarkdown> = persistentDriveCMSCache(
	"baseDownloadDocRevisionAndAdjustInDocMarkdownImages3",
	// We don't need to check the last modification time, because this function depends on revisionID.
	// Every revisionID represents different doc version.
	{ disableAutomaticInvalidation: true },
	async function baseDownloadDocRevisionAndAdjustInDocMarkdownImages(
		persistentCacheController: PersistentCacheController<StringMarkdown>,
		googleAuth: GoogleAuth,
		docID: DocID,
		revisionID: RevisionID,
	): ErrorReturnPromise<StringMarkdown> {
		const [cachedValue, cacheError] = await persistentCacheController.getCachedValue();
		if (cacheError) {
			return [null, cacheError];
		}

		if (cachedValue) {
			return [cachedValue, null];
		}

		const [docAsMarkdown, errorDownloadFile] = await downloadFile<StringMarkdown>(googleAuth, docID, revisionID, MIMEType.markdown);
		if (errorDownloadFile !== null) {
			return [null, errorDownloadFile];
		}

		if (typeof docAsMarkdown !== "string") {
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
			const cacheSetError = await persistentCacheController.setCachedValue(docAsMarkdown);
			if (cacheSetError) {
				return [null, cacheSetError];
			}

			return [docAsMarkdown, null];
		}

		const [sortedPhotoIDAndImageURL, errorSort] = sortPhotoIDAndImageURLArrayBasedOnDocOrder(webSource, photoIDAndImageURL);
		if (errorSort !== null) {
			return [null, errorSort];
		}

		// ==================================================
		// Adjust image URLs
		let docAsMarkdownAdjusted = docAsMarkdown;

		const imageURLs = sortedPhotoIDAndImageURL.map((photoIDAndImageURL) => photoIDAndImageURL.url);
		for (const imageURL of imageURLs) {
			// TODO: The alt text can be 99% extracted from the metadata.
			docAsMarkdownAdjusted = docAsMarkdownAdjusted.replace(MARKDOWN_IMAGE_REGEX, `![TODO_ALT_TEXT](${imageURL})`) as StringMarkdown;
		}

		// ==================================================
		// Remove base64 encoded definitions form the markdown
		const imageBase64Definitions = docAsMarkdownAdjusted.indexOf(IMAGE_BASE64_MARKDOWN_DEFINITION_AT_THE_END);
		if (imageBase64Definitions === -1) {
			return [null, new Error(unreachableErrorMessage("Unable to find image base64 definitions in the markdown"))];
		}

		docAsMarkdownAdjusted = docAsMarkdownAdjusted.slice(0, imageBase64Definitions - 1) as StringMarkdown;

		// ==================================================
		// Cache
		const cacheSetError = await persistentCacheController.setCachedValue(docAsMarkdownAdjusted);
		if (cacheSetError) {
			return [null, cacheSetError];
		}

		return [docAsMarkdownAdjusted, null];
	},
);

export const getDocRevisions = memoizeDriveCMS(async function getDocRevisions(googleAuth: GoogleAuth, docID: DocID): ErrorReturnPromise<Revision[]> {
	const validationError = validateDocID(docID);
	if (validationError !== null) {
		return [null, validationError];
	}

	const [revisions, err] = await getRevisionsFromUndocumentedAPIPersistentCached(
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

const DOCS_MODEL_CHUNK_START_STRING = ">DOCS_modelChunk = ";
const DOCS_MODEL_CHUNK_END_STRING = "; DOCS_modelChunkLoadStart ";

const ERR_UNABLE_FIND_SEARCH_START_INDEX = new Error(unreachableErrorMessage("Google changed something: Unable to find searchStartIndex"));
const ERR_UNABLE_FIND_SEARCH_END_INDEX = new Error(unreachableErrorMessage("Google changed something: Unable to find searchEndIndex"));

// These errors can be omitted if startIndex > 0
const NON_CRITICAL_EXTRACT_SINGLE_DOCS_MODEL_CHUNK_ERRORS = [ERR_UNABLE_FIND_SEARCH_START_INDEX, ERR_UNABLE_FIND_SEARCH_END_INDEX];

function sortPhotoIDAndImageURLArrayBasedOnDocOrder(
	source: GoogleInternalWebInterfacePageSource,
	array: GoogleInternalPhotoIDAndImageURL[],
): ErrorReturn<GoogleInternalPhotoIDAndImageURL[]> {
	type DocsModelChunk = any;
	function extractSingleDocsModelChunk(
		source: GoogleInternalWebInterfacePageSource,
		startIndex: number,
	): ErrorReturn<{ docsModelChunk: DocsModelChunk; endIndex: number }> {
		const searchStartIndex = source.indexOf(DOCS_MODEL_CHUNK_START_STRING, startIndex);
		if (searchStartIndex === -1) {
			return [null, new CSE(ERR_UNABLE_FIND_SEARCH_START_INDEX)];
		}

		const searchEndIndex = source.indexOf(DOCS_MODEL_CHUNK_END_STRING, startIndex);
		if (searchEndIndex === -1) {
			return [null, new CSE(ERR_UNABLE_FIND_SEARCH_END_INDEX)];
		}

		const docsModelChunkString = source.slice(searchStartIndex + DOCS_MODEL_CHUNK_START_STRING.length, searchEndIndex);
		const [docsModelChunkOrNot, jsonParingError] = safe(() => JSON.parse(docsModelChunkString));
		if (jsonParingError) {
			return [null, jsonParingError];
		}

		let docsModelChunk: DocsModelChunk = null;
		if ("chunk" in docsModelChunkOrNot) {
			docsModelChunk = docsModelChunkOrNot.chunk;
		} else {
			docsModelChunk = docsModelChunkOrNot;
		}

		return [{ docsModelChunk, endIndex: searchEndIndex + 1 }, null];
	}

	const copyArray: GoogleInternalPhotoIDAndImageURL[] = array.slice();

	const docsModelChunks: DocsModelChunk[] = [];
	let startIndex = 0;
	while (true) {
		const [extractSingleDocsModelChunkReturn, extractSingleDocsModelChunkError] = extractSingleDocsModelChunk(source, startIndex);
		if (extractSingleDocsModelChunkError) {
			if (docsModelChunks.length === 0 || !errorIsInArray(extractSingleDocsModelChunkError, NON_CRITICAL_EXTRACT_SINGLE_DOCS_MODEL_CHUNK_ERRORS)) {
				return [null, extractSingleDocsModelChunkError];
			}

			break;
		}

		docsModelChunks.push(extractSingleDocsModelChunkReturn.docsModelChunk);
		startIndex = extractSingleDocsModelChunkReturn.endIndex;
	}

	// kix is an ID used to mark every "entity" on the docs page. Paragraph, image, etc...
	// spi is an indication where on page is this specific entity.
	// We have to map GoogleInternalPhotoID to kixID and then sort these kixID by SPI.
	const kixIDtoSPI = new Map<string, number>();
	const photoIDtoKixID = new Map<string, string>();
	for (const docsModelChunk of docsModelChunks) {
		for (const smallChunk of docsModelChunk) {
			if (smallChunk.spi) {
				kixIDtoSPI.set(smallChunk.id, smallChunk.spi);
			}

			// this is where the photoID is stored
			const iCid = smallChunk.epm?.ee_eo?.i_cid;
			if (iCid) {
				photoIDtoKixID.set(iCid, smallChunk.id);
			}
		}
	}

	// ==================================================
	// TODO: Make this into for loop
	let mapError: Error | null = null;
	const arrayWithIndexInSource = copyArray
		.map((photoIDAndImageURL) => {
			const rawPhotoID = photoIDAndImageURL.id;
			const kixID = photoIDtoKixID.get(rawPhotoID);
			if (!kixID) {
				mapError = new Error(unreachableErrorMessage(`Google changed something: Unable to find photo ID ${rawPhotoID} in kixIDtoSPI`));
				return undefined;
			}

			const spi = kixIDtoSPI.get(kixID);
			if (!spi) {
				mapError = new Error(unreachableErrorMessage(`Google changed something: Unable to find kixID ${kixID} in kixIDtoSPI`));
				return undefined;
			}
			const sortNumber = spi;

			return { ...photoIDAndImageURL, sortNumber };
		})
		.filter((x) => !!x);
	if (mapError) {
		return [null, mapError];
	}
	// ==================================================

	const sortedArrayWithIndexInSource = arrayWithIndexInSource.sort((a, b) => a.sortNumber - b.sortNumber);
	const sortedArray = sortedArrayWithIndexInSource.map((photoIDAndImageURL) => ({ id: photoIDAndImageURL.id, url: photoIDAndImageURL.url }));
	return [sortedArray, null];
}

const COMMON_URL_PART = "https://lh7-rt.googleusercontent.com/docsz/";
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

		const encodedURL = source.slice(urlStartIndex, endQuoteIndex);
		if (!encodedURL) {
			return [null, new Error(unreachableErrorMessage("Google changed something: We matched urlStartIndex and endQuoteIndex, but escapedURL is empty..."))];
		}

		// We are replacing the escaped equal sign, with a real one. I don't think pulling a whole lib to do just this is necessary.
		const decodedURL = decodeURIComponent(encodedURL).replace(/\\u003d/g, "=") as ImageURL;

		const photoIDEndIndex = urlStartIndex - URL_START_INDEX_TO_ID_END_INDEX_OFFSET;
		const photoIDStartIndex = source.lastIndexOf(`"`, photoIDEndIndex);

		// We need to shift one to the right because we are off one.
		const photoID = source.slice(photoIDStartIndex + 1, photoIDEndIndex + 1) as GoogleInternalPhotoID;
		if (!photoID) {
			return [null, new Error(unreachableErrorMessage("Google changed something: We matched photoIDStartIndex and photoIDEndIndex, but photoID is empty..."))];
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
		return createAPIRequest<string>({
			context: { _options: { auth: googleAuth } },
			options: {
				method: "GET",
				url: undocumentedDownloadURL,
			},
			params: {},
			pathParams: [],
			requiredParams: [],
		});
	});

	if (errorGaxios !== null) {
		return [null, new Error(`Gaxios API request failed: ${errorGaxios}`, { cause: errorGaxios })];
	}

	if (response.status !== StatusCodes.OK) {
		return [null, new Error(`Gaxios API request failed: status code is not 200: ${response.status}`)];
	}

	if (!response.data) {
		return [null, new Error("Gaxios API request failed: response.data is empty")];
	}

	return [response.data as GoogleInternalWebInterfacePageSource, null];
}
