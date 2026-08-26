// biome-ignore-all lint/plugin/no-throw: The upload boundary intentionally rejects forged descriptors and failed persistence.
import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import type { Payload } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mediaBucket = vi.hoisted(() => ({ delete: vi.fn(), put: vi.fn() }));
vi.mock("@payload-config", () => ({ mediaBucket }));

import { createOptimizedMedia, deleteOptimizedMedia, validateOptimizedImageUpload } from "../../src/lib/optimized-media";

const descriptor: OptimizedImageDescriptor = {
	contentHash: "a".repeat(64),
	height: 800,
	width: 1200,
	img: {
		src: "/api/media/file/upload-1200.webp",
		srcSet: "/api/media/file/upload-640.webp 640w, /api/media/file/upload-1200.webp 1200w",
	},
	sources: [{ srcSet: "/api/media/file/upload-640.avif 640w, /api/media/file/upload-1200.avif 1200w", type: "image/avif" }],
};

function uploadForm(overrides: Partial<OptimizedImageDescriptor> = {}): FormData {
	const form = new FormData();
	form.set("descriptor", JSON.stringify({ ...descriptor, ...overrides }));
	for (const key of ["upload-640.webp", "upload-1200.webp", "upload-640.avif", "upload-1200.avif"]) {
		form.append("artifacts", new File([key], key, { type: key.endsWith(".avif") ? "image/avif" : "image/webp" }));
	}
	return form;
}

describe("optimized CMS media", () => {
	beforeEach(() => {
		mediaBucket.delete.mockReset();
		mediaBucket.put.mockReset();
	});

	it("accepts a matching AVIF/WebP descriptor and rejects a forged one", () => {
		expect(validateOptimizedImageUpload(uploadForm()).artifacts).toHaveLength(4);
		expect(() => validateOptimizedImageUpload(uploadForm({ img: { ...descriptor.img, srcSet: `${descriptor.img.srcSet}, /api/media/file/forged.webp 1800w` } }))).toThrow(
			"Descriptor nie odpowiada przesłanym plikom.",
		);
	});

	it("rolls back every directly written R2 artifact when Payload persistence fails", async () => {
		const payload = { create: vi.fn().mockRejectedValue(new Error("D1 failed")), delete: vi.fn() } as unknown as Payload;
		await expect(createOptimizedMedia(payload, uploadForm(), "Test")).rejects.toThrow("D1 failed");
		expect(mediaBucket.put).toHaveBeenCalledTimes(3);
		expect(mediaBucket.put.mock.calls.every(([, body]) => body instanceof ArrayBuffer)).toBe(true);
		expect(mediaBucket.delete).toHaveBeenCalledTimes(3);
	});

	it("deletes the Payload record and all optimized artifacts", async () => {
		const payload = {
			delete: vi.fn().mockResolvedValue(undefined),
			findByID: vi.fn().mockResolvedValue({ optimizedFiles: ["upload-640.webp", "upload-1200.webp", "upload-640.avif", "upload-1200.avif"] }),
		} as unknown as Payload;
		await deleteOptimizedMedia(payload, 42);
		expect(payload.delete).toHaveBeenCalledWith({ collection: "media", id: 42, overrideAccess: true });
		expect(mediaBucket.delete).toHaveBeenCalledTimes(4);
	});
});
