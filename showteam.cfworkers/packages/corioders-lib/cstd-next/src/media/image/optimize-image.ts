// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import { type ErrorReturnPromise, safe, safePromise } from "cstd-ts/error/index.js";

import type { BrowserImageWorkerRequest, BrowserImageWorkerResponse } from "./optimize-image-worker.js";
import type { OptimizedImageDescriptor, OptimizedImageFormat } from "./optimized-image.jsx";
import { getTargetWidthsFromSizes } from "./sizes.js";

const BROWSER_IMAGE_PIPELINE_VERSION = 1;
// ponytail: 2560px bounds the longest RGBA/WASM edge after browser decode; expose a policy only when a consumer proves it needs larger CMS uploads.
const MAX_BROWSER_IMAGE_DIMENSION = 2560;
const TRAILING_SLASH_REGEX = /\/$/;

export interface OptimizedImageFile {
	data: Blob;
	key: string;
	type: `image/${OptimizedImageFormat}`;
}

export interface OptimizeImageOptions {
	/** Public URL prefix corresponding to outputPathPrefix, for example /media. */
	baseURL: string;
	/** Overrides File.name in generated object keys. */
	filename?: string;
	/** Storage key prefix, for example media. */
	outputPathPrefix: string;
	sizes: string;
}

export interface OptimizedImageArtifact {
	descriptor: OptimizedImageDescriptor;
	files: OptimizedImageFile[];
}

interface PendingWorkerRequest {
	reject(error: Error): void;
	resolve(response: BrowserImageWorkerResponse & { error: null }): void;
}

let imageWorker: Worker | undefined;
let nextWorkerRequestId = 1;
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>();

/** Browser-local CMS optimizer. Returns uploadable AVIF/WebP objects and their persisted rendering descriptor. */
export async function optimizeImage(imageFile: File, options: OptimizeImageOptions): ErrorReturnPromise<OptimizedImageArtifact> {
	if (!(typeof window === "object" && typeof Worker === "function" && typeof createImageBitmap === "function")) {
		return [null, new Error("optimizeImage requires a browser with Worker and createImageBitmap support.")];
	}

	const [loadedSource, sourceError] = await safePromise(() => Promise.all([imageFile.arrayBuffer(), createImageBitmap(imageFile)]));
	if (sourceError !== null) {
		return [null, new Error(`The browser cannot decode image '${imageFile.name}'.`, { cause: sourceError })];
	}
	const [sourceBytes, bitmap] = loadedSource;
	try {
		const sourceDimensions = { height: bitmap.height, width: bitmap.width };
		const optimizationScale = Math.min(1, MAX_BROWSER_IMAGE_DIMENSION / Math.max(sourceDimensions.width, sourceDimensions.height));
		const optimizationSourceWidth = Math.max(1, Math.floor(sourceDimensions.width * optimizationScale));
		const [targetWidths, targetWidthsError] = getTargetWidthsFromSizes(options.sizes, optimizationSourceWidth);
		if (targetWidthsError !== null) {
			return [null, targetWidthsError];
		}
		const workerSourceWidth = targetWidths.at(-1);
		if (workerSourceWidth === undefined) {
			return [null, new Error("Image sizes produced no browser optimization widths.")];
		}
		const workerSourceHeight = Math.max(1, Math.round((sourceDimensions.height * workerSourceWidth) / sourceDimensions.width));
		const canvas = document.createElement("canvas");
		canvas.width = workerSourceWidth;
		canvas.height = workerSourceHeight;
		const context = canvas.getContext("2d", { alpha: true });
		if (context === null) {
			return [null, new Error("Unable to create a browser image canvas.")];
		}
		const [sourcePixels, canvasError] = safe(() => {
			context.drawImage(bitmap, 0, 0, workerSourceWidth, workerSourceHeight);
			return context.getImageData(0, 0, workerSourceWidth, workerSourceHeight);
		});
		if (canvasError !== null) {
			return [null, new Error(`Unable to read decoded image '${imageFile.name}'.`, { cause: canvasError })];
		}
		const [workerOutput, workerError] = await safePromise(() => encodeImageVariants(sourcePixels, targetWidths));
		if (workerError !== null) {
			return [null, new Error(`Unable to optimize image '${imageFile.name}'.`, { cause: workerError })];
		}
		const [hashes, hashError] = await safePromise(async () => {
			const contentHash = await digestHex(sourceBytes);
			const optimizationHash = await digestHex(new TextEncoder().encode(`cstd-browser-image-v${BROWSER_IMAGE_PIPELINE_VERSION}:${contentHash}`));
			return { contentHash, optimizationHash };
		});
		if (hashError !== null) {
			return [null, new Error(`Unable to hash image '${imageFile.name}'.`, { cause: hashError })];
		}
		const filename = sanitizeFilename(options.filename ?? imageFile.name);
		const baseURL = options.baseURL.replace(TRAILING_SLASH_REGEX, "");
		const outputPathPrefix = options.outputPathPrefix.replace(TRAILING_SLASH_REGEX, "");
		const files: OptimizedImageFile[] = [];

		const avifSrcSet = createFormatFiles("avif", workerOutput.outputs, filename, hashes.optimizationHash, baseURL, outputPathPrefix, files);
		const webpSrcSet = createFormatFiles("webp", workerOutput.outputs, filename, hashes.optimizationHash, baseURL, outputPathPrefix, files);
		const largestOutput = workerOutput.outputs.at(-1);
		if (largestOutput === undefined) {
			return [null, new Error("Browser image optimization produced no files.")];
		}

		return [
			{
				descriptor: {
					contentHash: hashes.contentHash,
					height: sourceDimensions.height,
					img: {
						src: getPublicImageURL(baseURL, getOutputFilename(filename, hashes.optimizationHash, largestOutput.width, "webp")),
						srcSet: webpSrcSet,
					},
					sources: [{ srcSet: avifSrcSet, type: "image/avif" }],
					width: sourceDimensions.width,
				},
				files,
			},
			null,
		];
	} finally {
		bitmap.close();
	}
}

function encodeImageVariants(source: ImageData, targetWidths: number[]): Promise<BrowserImageWorkerResponse & { error: null }> {
	const worker = getImageWorker();
	const id = nextWorkerRequestId;
	nextWorkerRequestId += 1;
	const request: BrowserImageWorkerRequest = {
		id,
		source: { data: source.data.buffer, height: source.height, width: source.width },
		targetWidths,
	};

	return new Promise((resolve, reject) => {
		pendingWorkerRequests.set(id, { reject, resolve });
		worker.postMessage(request, [request.source.data]);
	});
}

function getImageWorker(): Worker {
	if (imageWorker !== undefined) {
		return imageWorker;
	}

	imageWorker = new Worker(new URL("./optimize-image-worker.js", import.meta.url), { name: "cstd-image-optimizer", type: "module" });
	imageWorker.addEventListener("message", handleWorkerMessage);
	imageWorker.addEventListener("error", (event) => resetFailedWorker(new Error(event.message || "Browser image worker failed.")));
	imageWorker.addEventListener("messageerror", () => resetFailedWorker(new Error("Browser image worker returned an unreadable response.")));
	return imageWorker;
}

function handleWorkerMessage(event: MessageEvent<BrowserImageWorkerResponse>): void {
	const response = event.data;
	const pendingRequest = pendingWorkerRequests.get(response.id);
	if (pendingRequest === undefined) {
		return;
	}

	pendingWorkerRequests.delete(response.id);
	if (response.error !== null) {
		pendingRequest.reject(new Error(response.error));
		return;
	}
	pendingRequest.resolve(response);
}

function resetFailedWorker(error: Error): void {
	imageWorker?.terminate();
	imageWorker = undefined;
	for (const pendingRequest of pendingWorkerRequests.values()) {
		pendingRequest.reject(error);
	}
	pendingWorkerRequests.clear();
}

function createFormatFiles(
	format: OptimizedImageFormat,
	outputs: (BrowserImageWorkerResponse & { error: null })["outputs"],
	filename: string,
	optimizationHash: string,
	baseURL: string,
	outputPathPrefix: string,
	files: OptimizedImageFile[],
): string {
	const candidates: string[] = [];
	for (const output of outputs) {
		const outputFilename = getOutputFilename(filename, optimizationHash, output.width, format);
		const data = new Blob([output[format]], { type: `image/${format}` });
		files.push({ data, key: joinPath(outputPathPrefix, outputFilename), type: `image/${format}` });
		candidates.push(`${getPublicImageURL(baseURL, outputFilename)} ${output.width.toString()}w`);
	}
	return candidates.join(", ");
}

function getOutputFilename(filename: string, optimizationHash: string, width: number, format: OptimizedImageFormat): string {
	return `${filename}.${optimizationHash}.${width.toString()}.${format}`;
}

function getPublicImageURL(baseURL: string, filename: string): string {
	return `${baseURL}/${encodeURIComponent(filename)}`;
}

function joinPath(prefix: string, filename: string): string {
	return prefix ? `${prefix}/${filename}` : filename;
}

async function digestHex(data: BufferSource): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeFilename(filename: string): string {
	const sanitized = filename
		.replaceAll(/[/|\\:*?"<>]/g, " ")
		.replaceAll("\n", " ")
		.trim();
	return sanitized || "image";
}
