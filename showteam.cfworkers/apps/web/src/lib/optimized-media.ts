// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
import { Buffer } from "node:buffer";

import { mediaBucket } from "@payload-config";
import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import type { Payload } from "payload";

const MAX_ARTIFACT_BYTES = 15 * 1024 * 1024;
const MAX_ARTIFACTS = 16;
const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,220}\.(?:avif|webp)$/;

type StoredOptimizedMedia = {
	id: number;
	descriptor: OptimizedImageDescriptor;
	files: string[];
	url: string;
};

export async function createOptimizedMedia(payload: Payload, form: FormData, alt: string): Promise<StoredOptimizedMedia> {
	const { descriptor, artifacts } = validateOptimizedImageUpload(form);

	const mainKey = keyFromURL(descriptor.img.src);
	const main = artifacts.find((file) => file.name === mainKey && file.type === "image/webp");
	if (!main) {
		throw new Error("Brakuje głównego pliku WebP.");
	}
	const extraFiles = artifacts.filter((file) => file !== main);
	const written: string[] = [];
	let mediaId: number | undefined;
	try {
		for (const file of extraFiles) {
			await mediaBucket.put(file.name, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
			written.push(file.name);
		}
		const media = await payload.create({
			collection: "media",
			overrideAccess: true,
			data: {
				alt,
				contentHash: descriptor.contentHash,
				optimizedFiles: artifacts.map((file) => file.name),
				optimizedImage: descriptor as unknown as Record<string, unknown>,
			},
			file: { data: Buffer.from(await main.arrayBuffer()), mimetype: main.type, name: main.name, size: main.size },
		});
		mediaId = Number(media.id);
		return { id: mediaId, descriptor, files: artifacts.map((file) => file.name), url: descriptor.img.src };
	} catch (error) {
		await Promise.allSettled(written.map((key) => mediaBucket.delete(key)));
		if (mediaId !== undefined) {
			await payload.delete({ collection: "media", id: mediaId, overrideAccess: true }).catch(() => undefined);
		}
		throw error;
	}
}

export function validateOptimizedImageUpload(form: FormData): { descriptor: OptimizedImageDescriptor; artifacts: File[] } {
	const descriptor = parseDescriptor(form.get("descriptor"));
	const artifacts = form.getAll("artifacts").filter((value): value is File => value instanceof File);
	const expected = descriptorKeys(descriptor);
	const actual = new Set(artifacts.map((file) => file.name));
	if (artifacts.length === 0 || artifacts.length > MAX_ARTIFACTS || actual.size !== artifacts.length || expected.size !== actual.size) {
		throw new Error("Descriptor nie odpowiada przesłanym plikom.");
	}
	for (const file of artifacts) {
		if (!SAFE_KEY.test(file.name) || !expected.has(file.name) || file.size === 0 || file.size > MAX_ARTIFACT_BYTES || !["image/avif", "image/webp"].includes(file.type)) {
			throw new Error("Nieprawidłowy artifact obrazu.");
		}
	}

	return { descriptor, artifacts };
}

export async function deleteOptimizedMedia(payload: Payload, mediaId: number | null | undefined): Promise<void> {
	if (mediaId === null || mediaId === undefined) {
		return;
	}
	const media = await payload.findByID({ collection: "media", id: mediaId, depth: 0, overrideAccess: true }).catch(() => null);
	const keys = media && Array.isArray(media.optimizedFiles) ? media.optimizedFiles.filter((key): key is string => typeof key === "string") : [];
	await payload.delete({ collection: "media", id: mediaId, overrideAccess: true }).catch(() => undefined);
	await Promise.allSettled(keys.map((key) => mediaBucket.delete(key)));
}

function parseDescriptor(value: FormDataEntryValue | null): OptimizedImageDescriptor {
	if (typeof value !== "string" || value.length > 30_000) {
		throw new Error("Brakuje descriptoru obrazu.");
	}
	const descriptor = JSON.parse(value) as Partial<OptimizedImageDescriptor>;
	if (
		typeof descriptor.contentHash !== "string" ||
		!/^[a-f0-9]{64}$/.test(descriptor.contentHash) ||
		!Number.isInteger(descriptor.width) ||
		!Number.isInteger(descriptor.height) ||
		!descriptor.img ||
		typeof descriptor.img.src !== "string" ||
		typeof descriptor.img.srcSet !== "string"
	) {
		throw new Error("Nieprawidłowy descriptor obrazu.");
	}
	return descriptor as OptimizedImageDescriptor;
}

function descriptorKeys(descriptor: OptimizedImageDescriptor): Set<string> {
	const entries = [descriptor.img.srcSet ?? "", ...(descriptor.sources ?? []).map((source) => source.srcSet)];
	return new Set(entries.flatMap((entry) => entry.split(",")).map((candidate) => keyFromURL(candidate.trim().split(/\s+/, 1)[0] ?? "")));
}

function keyFromURL(value: string): string {
	const prefix = "/api/media/file/";
	if (!value.startsWith(prefix)) {
		throw new Error("Descriptor wskazuje niedozwolony URL.");
	}
	const key = decodeURIComponent(value.slice(prefix.length));
	if (!SAFE_KEY.test(key)) {
		throw new Error("Descriptor zawiera niedozwolony klucz.");
	}
	return key;
}
