"use client";

import { optimizeImage } from "cstd-next/media/image/optimize-image.js";
import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import { useState } from "react";

import { panek } from "../_assets/index.ts";

const REMOTE_IMAGE_FIXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export function ClientImageExample() {
	const [optimizerStatus, setOptimizerStatus] = useState("idle");

	async function testBrowserOptimizer() {
		setOptimizerStatus("optimizing");
		const sourceCanvas = document.createElement("canvas");
		sourceCanvas.width = 4;
		sourceCanvas.height = 2;
		const sourceContext = sourceCanvas.getContext("2d");
		if (sourceContext === null) {
			setOptimizerStatus("error: canvas context unavailable");
			return;
		}
		sourceContext.fillStyle = "#ff00ff";
		sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
		const imageBlob = await new Promise<Blob | null>((resolve) => sourceCanvas.toBlob(resolve, "image/png"));
		if (imageBlob === null) {
			setOptimizerStatus("error: PNG fixture unavailable");
			return;
		}

		const [artifact, error] = await optimizeImage(new File([imageBlob], "fixture.unknown", { type: "application/octet-stream" }), {
			baseURL: "/cms",
			outputPathPrefix: "cms",
			sizes: "(max-width: 2px) 100vw, 4px",
		});
		if (error !== null) {
			setOptimizerStatus(`error: ${error.message}`);
			return;
		}

		const decodedDimensions = new Set<string>();
		for (const file of artifact.files) {
			const outputBitmap = await createImageBitmap(file.data);
			decodedDimensions.add(`${outputBitmap.width}x${outputBitmap.height}`);
			outputBitmap.close();
		}
		setOptimizerStatus(`${artifact.files.length.toString()} files ${[...decodedDimensions].join(",")} source ${artifact.descriptor.width}x${artifact.descriptor.height}`);
	}

	return (
		<section data-testid="client-component-boundary">
			<StaticImage src={panek} alt="Client local prerendered image" data-testid="client-local-image" loading="lazy" sizes="(max-width: 1200px) 100vw, 1200px" />
			<StaticImage
				src={REMOTE_IMAGE_FIXTURE}
				alt="Client-navigated prerendered image"
				data-testid="client-image"
				sizes="(max-width: 1343px) 100vw, 1343px"
				loading="lazy"
			/>
			<button type="button" onClick={testBrowserOptimizer}>
				Test browser image optimizer
			</button>
			<output data-testid="browser-image-optimizer-status">{optimizerStatus}</output>
		</section>
	);
}
