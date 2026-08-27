// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import avifEncoderFactory from "@jsquash/avif/codec/enc/avif_enc.js";
import { defaultOptions as defaultAvifOptions } from "@jsquash/avif/meta.js";
import { initEmscriptenModule } from "@jsquash/avif/utils.js";
import initializeResizeWasm, { resize as resizePixels } from "@jsquash/resize/lib/resize/pkg/squoosh_resize.js";
import encodeWebp from "@jsquash/webp/encode.js";

const LANCZOS_3_RESIZE_METHOD_INDEX = 3;

export interface BrowserImageWorkerRequest {
	id: number;
	source: {
		data: ArrayBuffer;
		height: number;
		width: number;
	};
	targetWidths: number[];
}

export interface BrowserImageWorkerOutput {
	avif: ArrayBuffer;
	height: number;
	webp: ArrayBuffer;
	width: number;
}

export type BrowserImageWorkerResponse = { error: null; id: number; outputs: BrowserImageWorkerOutput[] } | { error: string; id: number; outputs: null };

interface WorkerScope {
	addEventListener(type: "message", listener: (event: MessageEvent<BrowserImageWorkerRequest>) => void): void;
	postMessage(message: BrowserImageWorkerResponse, transfer: Transferable[]): void;
}

const workerScope = globalThis as unknown as WorkerScope;
const avifEncoder = initEmscriptenModule(avifEncoderFactory);
const resizeWasm = initializeResizeWasm();
let workQueue = Promise.resolve();

workerScope.addEventListener("message", (event) => {
	workQueue = workQueue.then(() => processRequest(event.data));
});

async function processRequest(request: BrowserImageWorkerRequest): Promise<void> {
	try {
		const source = new ImageData(new Uint8ClampedArray(request.source.data), request.source.width, request.source.height);
		const outputs: BrowserImageWorkerOutput[] = [];
		await resizeWasm;

		for (const targetWidth of request.targetWidths) {
			const targetHeight = Math.max(1, Math.round((source.height * targetWidth) / source.width));
			const target = targetWidth === source.width ? source : resizeWithLanczos3(source, targetWidth, targetHeight);
			const avifModule = await avifEncoder;
			const avifOutput = avifModule.encode(new Uint8Array(target.data.buffer), target.width, target.height, {
				...defaultAvifOptions,
				quality: 60,
				qualityAlpha: -1,
				speed: 6,
				subsample: 3,
			});
			if (avifOutput === null) {
				workerScope.postMessage({ error: "AVIF encoding failed.", id: request.id, outputs: null }, []);
				return;
			}
			const avif = avifOutput.buffer;
			const webp = await encodeWebp(target, {
				exact: 1,
				method: 4,
				quality: 80,
				// biome-ignore lint/style/useNamingConvention: jSquash exposes the libwebp option with this exact name.
				use_sharp_yuv: 1,
			});
			outputs.push({ avif, height: targetHeight, webp, width: targetWidth });
		}

		workerScope.postMessage(
			{ error: null, id: request.id, outputs },
			outputs.flatMap((output) => [output.avif, output.webp]),
		);
	} catch (error) {
		workerScope.postMessage(
			{
				error: error instanceof Error ? error.message : String(error),
				id: request.id,
				outputs: null,
			},
			[],
		);
	}
}

function resizeWithLanczos3(source: ImageData, targetWidth: number, targetHeight: number): ImageData {
	const sourcePixels = new Uint8Array(source.data.buffer);
	const targetPixels = resizePixels(sourcePixels, source.width, source.height, targetWidth, targetHeight, LANCZOS_3_RESIZE_METHOD_INDEX, true, true);
	return new ImageData(new Uint8ClampedArray(targetPixels), targetWidth, targetHeight);
}
