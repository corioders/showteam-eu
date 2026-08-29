// biome-ignore-all lint/plugin/no-throw: A missing hook is a test setup failure.
import { describe, expect, it } from "vitest";

import { Media } from "../../src/collections/Media";

const validateUpload = Media.hooks?.beforeValidate?.[0];

describe("media upload boundary", () => {
	it("rejects native image uploads without a cstd descriptor", () => {
		if (typeof validateUpload !== "function") {
			throw new Error("Media beforeValidate hook is missing.");
		}

		expect(() =>
			validateUpload({
				collection: Media,
				context: {},
				operation: "create",
				originalDoc: undefined,
				previousValue: undefined,
				req: { file: { mimetype: "image/jpeg" } },
				data: { alt: "Test" },
			} as never),
		).toThrow("Zdjęcia muszą zostać zoptymalizowane przez uploader cstd.");
	});

	it("accepts optimized images and native videos", () => {
		if (typeof validateUpload !== "function") {
			throw new Error("Media beforeValidate hook is missing.");
		}

		expect(validateUpload({ req: { file: { mimetype: "image/webp" } }, data: { optimizedImage: { width: 1200 } } } as never)).toMatchObject({
			optimizedImage: { width: 1200 },
		});
		expect(validateUpload({ req: { file: { mimetype: "video/mp4" } }, data: { alt: "Film" } } as never)).toMatchObject({ alt: "Film" });
	});
});
