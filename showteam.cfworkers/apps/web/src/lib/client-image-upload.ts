"use client";

import { optimizeImage } from "cstd-next/media/image/optimize-image.js";

const DEFAULT_IMAGE_SIZES = "(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw";

export async function appendOptimizedImage(form: FormData, file: File, sizes = DEFAULT_IMAGE_SIZES, suffix = ""): Promise<void> {
	const uniqueFilename = `${crypto.randomUUID()}-${file.name}`;
	const [artifact, error] = await optimizeImage(file, {
		baseURL: "/api/media/file",
		filename: uniqueFilename,
		outputPathPrefix: "",
		sizes,
	});
	if (error !== null) {
		throw error;
	}

	form.set(`descriptor${suffix}`, JSON.stringify(artifact.descriptor));
	for (const optimizedFile of artifact.files) {
		form.append(`artifacts${suffix}`, new File([optimizedFile.data], optimizedFile.key, { type: optimizedFile.type }));
	}
}
