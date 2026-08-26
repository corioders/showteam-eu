import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import * as svgo from "svgo";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { cleanPrerenderedImageProductionOutput } from "../src/media/image/clean-prerendered-image-output.js";
import type { GoogleDriveRemoteStaticImage } from "../src/media/image/google-drive-remote-static-image.jsx";
import { getPictureSourcesNotSvg, hash, optimizeImageBufferInternal, optimizeSvg, readImageInfoFromBuffer, shouldOptimizeImages } from "../src/media/image/internal.js";
import { OptimizedImage, validateSizesProperty } from "../src/media/image/optimized-image.jsx";
import { getDevelopmentPrerenderedImage } from "../src/media/image/prerendered-image-development.js";
import { getPrerenderedImageRequestKey, serializePrerenderedImageRequest } from "../src/media/image/prerendered-image-request.js";
import type { PrerenderedImageResource } from "../src/media/image/prerendered-image-resource.js";
import type { usePrerenderedImageResource as useBrowserPrerenderedImageResource } from "../src/media/image/prerendered-image-runtime-browser.js";
import { getPrerenderedImageFilename } from "../src/media/image/prerendered-image-source.js";
import { getTargetWidthsFromSizes } from "../src/media/image/sizes.js";
import type { StaticImage } from "../src/media/image/static-image.jsx";
import type { StaticImageImport } from "../src/media/image/static-image-import.js";
import pageManifestLoader from "../src/media/image/turbopack-loader/page-manifest-loader.js";
import staticImageImportLoader from "../src/media/image/turbopack-loader/static-image-import-loader.js";

const ONE_PIXEL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const ANIMATED_GIF = Buffer.from(
	"R0lGODlhAgADAPAAAP8AAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAAAAAACwAAAAAAgADAAACAoRfACH5BAAAAAAALAAAAAACAAMAgAAA/wAAAAIChF8AOw==",
	"base64",
);
const UNSAFE_SVG_OUTPUT_REGEX = /(?:<script|foreignObject|iframe|<animate|onload=|javascript:|https:\/\/example\.com)/u;
const SOURCE_SRC_ATTRIBUTE_REGEX = /<source[^>]*\ssrc=/;

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("image pipeline", () => {
	it("exposes prerendered images as synchronous components", () => {
		expectTypeOf<ReturnType<typeof StaticImage>>().not.toMatchTypeOf<PromiseLike<unknown>>();
		expectTypeOf<ReturnType<typeof GoogleDriveRemoteStaticImage>>().not.toMatchTypeOf<PromiseLike<unknown>>();
		expectTypeOf<ReturnType<typeof useBrowserPrerenderedImageResource>>().toEqualTypeOf<PrerenderedImageResource>();
	});

	it("wraps pages at a server boundary without making unused client page props dynamic", () => {
		const loaderContext = {
			cacheable: vi.fn(),
			resourcePath: "/project/app/page.tsx",
			resourceQuery: "",
		};
		const clientPageWithoutProps = pageManifestLoader.call(loaderContext, '"use client"; export default function Page() { return null; }');
		const clientPageWithParams = pageManifestLoader.call(
			loaderContext,
			'"use client"; const Page = ({ params }: { params: Promise<unknown> }) => null; export default Page;',
		);
		const serverPage = pageManifestLoader.call(loaderContext, "export default function Page(props: unknown) { return props; }");

		expect(clientPageWithoutProps).toContain("createElement(ClientPageRoot, { Component: OriginalPage, serverProvidedParams: null })");
		expect(clientPageWithParams).toContain("createElement(ClientPageRoot, { Component: OriginalPage, serverProvidedParams: null })");
		expect(serverPage).toContain("createElement(OriginalPage, props)");
		expect(loaderContext.cacheable).toHaveBeenCalledWith(true);
	});

	it("includes sizes in the prerendered image cache key", () => {
		const firstRequest = { sizes: "100vw", src: "https://example.com/hero.jpg" };
		const secondRequest = { sizes: "50vw", src: "https://example.com/hero.jpg" };
		const firstSerializedRequest = serializePrerenderedImageRequest(firstRequest);
		const secondSerializedRequest = serializePrerenderedImageRequest(secondRequest);

		expect(firstSerializedRequest).not.toBe(secondSerializedRequest);
		expect(getPrerenderedImageRequestKey(firstRequest)).toHaveLength(32);
		expect(getPrerenderedImageRequestKey(firstRequest)).not.toBe(getPrerenderedImageRequestKey(secondRequest));
	});

	it("uses the immutable loader artifact when a production route renders dynamically", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_IS_EXPORT_WORKER", "false");
		const runtimeAsset = { contentHash: "runtime", height: 1, img: { src: "/_cstd/image/asset/runtime/image.webp" }, width: 1 };
		const { loadPrerenderedImage } = await import("../src/media/image/prerendered-image-runtime.js");

		await expect(loadPrerenderedImage({ runtimeAsset, sizes: "100vw", src: "cstd-local://hash/image.png" })).resolves.toEqual(runtimeAsset);
	});

	it("optimizes only normal production builds", () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("APP_ENV", "production");
		expect(shouldOptimizeImages()).toBe(true);

		vi.stubEnv("APP_ENV", "preview");
		expect(shouldOptimizeImages()).toBe(false);

		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("APP_ENV", "development");
		expect(shouldOptimizeImages()).toBe(false);
	});

	it("uses source URLs directly in the development browser runtime", () => {
		vi.stubEnv("NODE_ENV", "development");
		const resource = getDevelopmentPrerenderedImage(
			{
				sizes: "100vw",
				src: "https://example.com/hero.jpg",
			},
			"request-key",
		);

		expect(resource).toEqual({
			image: {
				contentHash: "request-key",
				height: 0,
				img: { src: "https://example.com/hero.jpg" },
				width: 0,
			},
		});
	});

	it("derives output filenames from local, remote, and data sources", () => {
		expect(getPrerenderedImageFilename("https://example.com/media/Hero%20photo.jpeg?token=secret")).toEqual(["Hero photo.jpeg", null]);
		expect(getPrerenderedImageFilename("data:image/png;base64,fixture")).toEqual(["image.png", null]);
		expect(getPrerenderedImageFilename("https://example.com/")).toEqual(["image", null]);
		expect(getPrerenderedImageFilename("cstd-local://abcdef/static.png")).toEqual(["static.png", null]);
	});

	it("sanitizes executable and externally loaded SVG content in development and production", () => {
		const unsafeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="alert(1)">
			<style>@import url(https://example.com/style.css); .safe { fill: red }</style>
			<script>alert(1)</script>
			<foreignObject><iframe src="https://example.com"></iframe></foreignObject>
			<image href="https://example.com/tracker.png" width="10" height="10"/>
			<animate attributeName="href" to="javascript:alert(1)"/>
			<defs><linearGradient id="gradient"><stop offset="0" stop-color="red"/></linearGradient></defs>
			<rect class="safe" width="10" height="10" fill="url(#gradient)" style="stroke:url(https://example.com/stroke.svg)"/>
			<use href="#safe-shape"/>
		</svg>`;

		for (const isDevelopmentMode of [true, false]) {
			const safeSvg = optimizeSvg(isDevelopmentMode, unsafeSvg, svgo);
			expect(safeSvg).not.toMatch(UNSAFE_SVG_OUTPUT_REGEX);
			expect(safeSvg).toContain('href="#safe-shape"');
			if (isDevelopmentMode) {
				expect(safeSvg).toContain("url(#gradient)");
			}
		}
	});

	it("optimizes build inputs into serializable browser data", async () => {
		const [artifact, error] = await optimizeTestImage(ONE_PIXEL_PNG, "cms.png", "1px");

		expect(error).toBeNull();
		expect(artifact).not.toBeNull();
		expect(artifact?.files.map((file) => file.type)).toEqual(["image/avif", "image/webp"]);
		expect(artifact?.files.every((file) => file.key.startsWith("media/cms.png."))).toBe(true);
		expect(artifact?.files.every((file) => !file.key.includes(hash(ONE_PIXEL_PNG, createHash)))).toBe(true);
		expect(JSON.parse(JSON.stringify(artifact?.descriptor))).toEqual(artifact?.descriptor);
	});

	it("renders the shared descriptor without next/image", () => {
		const html = renderToStaticMarkup(
			<OptimizedImage
				alt="CMS image"
				loading="lazy"
				sizes="1px"
				src={{
					contentHash: "hash",
					height: 1,
					img: { src: "/media/cms.webp", srcSet: "/media/cms.webp 1w" },
					sources: [{ srcSet: "/media/cms.avif 1w", type: "image/avif" }],
					width: 1,
				}}
			/>,
		);

		expect(html).toContain("<picture>");
		expect(html).toContain('type="image/avif"');
		expect(html).toContain("<img");
		for (const attribute of ['alt="CMS image"', 'height="1"', 'loading="lazy"', 'sizes="1px"', 'src="/media/cms.webp"', 'srcSet="/media/cms.webp 1w"', 'width="1"']) {
			expect(html).toContain(attribute);
		}
		expect(html).not.toMatch(SOURCE_SRC_ATTRIBUTE_REGEX);
		expect(html).not.toContain("/_next/image");
	});

	it("returns unsupported sizes as validation errors", () => {
		const [_, sizesError] = validateSizesProperty(undefined, "hero.jpg");
		const [__, unsupportedSizesError] = getTargetWidthsFromSizes("calc(100vw - 2rem)", 1200);

		expect(sizesError).toBeInstanceOf(Error);
		expect(unsupportedSizesError).toBeInstanceOf(Error);
	});

	it("uses EXIF-oriented dimensions", async () => {
		const orientedJpeg = await sharp({ create: { background: "red", channels: 3, height: 3, width: 2 } })
			.withMetadata({ orientation: 6 })
			.jpeg()
			.toBuffer();
		const [imageInfo, error] = await readImageInfoFromBuffer(orientedJpeg, sharp);

		expect(error).toBeNull();
		expect(imageInfo).toMatchObject({ height: 2, pages: 1, width: 3 });
	});

	it("uses one animation frame for layout and emits only WebP", async () => {
		const [imageInfo, imageInfoError] = await readImageInfoFromBuffer(ANIMATED_GIF, sharp);
		const [artifact, optimizationError] = await optimizeTestImage(ANIMATED_GIF, "animated.gif", "2px");
		const outputMetadata = await sharp(artifact?.files[0]?.data, { animated: true }).metadata();

		expect(imageInfoError).toBeNull();
		expect(imageInfo).toMatchObject({ height: 3, pages: 2, width: 2 });
		expect(optimizationError).toBeNull();
		expect(artifact?.files.map((file) => file.type)).toEqual(["image/webp"]);
		expect(outputMetadata).toMatchObject({ pageHeight: 3, pages: 2 });
		expect(artifact?.descriptor).toMatchObject({ height: 3, img: { src: expect.stringContaining(".webp") }, sources: [], width: 2 });
	});

	it("derives generated widths from sizes and bounds them by the source", () => {
		const imageInfo = { height: 3333, imageSize: 1, pages: 1, type: "jpeg" as const, width: 5000 };
		const [targetWidths, targetWidthsError] = getTargetWidthsFromSizes("(max-width: 1200px) 100vw, 1200px", imageInfo.width);
		const [sources, sourcesError] = getPictureSourcesNotSvg(false, "large.jpg", "hash", imageInfo, "output", targetWidths ?? []);
		const sourcesResult = sources ?? [];

		expect(targetWidthsError).toBeNull();
		expect(targetWidths).toEqual([320, 375, 425, 640, 750, 768, 850, 1024, 1200, 1280, 1536, 2048, 2400]);
		expect(sourcesError).toBeNull();
		expect(sourcesResult.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
		expect(sourcesResult[0].srcSet).toContain("2400w");
		expect(sourcesResult[0].srcSet).toContain("320w");
		expect(sourcesResult[0].srcSet).not.toContain("3840w");
		expect(sourcesResult[0].srcSet).not.toContain("5000w");
	});

	it("uses source dimensions for development placeholder limits", () => {
		const smallImageInfo = { height: 4096, imageSize: Number.MAX_SAFE_INTEGER, pages: 1, type: "jpeg" as const, width: 4096 };
		const largeImageInfo = { height: 4096, imageSize: 1, pages: 1, type: "jpeg" as const, width: 4097 };
		const [smallSources, smallSourcesError] = getPictureSourcesNotSvg(true, "small.jpg", "hash", smallImageInfo, "output", [320]);
		const [largeSources, largeSourcesError] = getPictureSourcesNotSvg(true, "large.jpg", "hash", largeImageInfo, "output", [320]);

		expect(smallSourcesError).toBeNull();
		expect(largeSourcesError).toBeNull();
		expect(smallSources?.[0]?.imgSrc).toContain("small.jpg.development.hash");
		expect(largeSources?.[0]?.imgSrc).toContain("PERFORMANCE_PLACEHOLDER_");
	});

	it("revalidates cached remote images and replaces changed content", async () => {
		const changedPng = await sharp({ create: { background: "red", channels: 3, height: 1, width: 1 } })
			.png()
			.toBuffer();
		const requestHeaders: {
			authorization: string | undefined;
			ifModifiedSince: string | string[] | undefined;
			ifNoneMatch: string | string[] | undefined;
		}[] = [];
		const imageVersions = [ONE_PIXEL_PNG, changedPng];
		const lastModifiedVersions = ["Wed, 21 Oct 2015 07:28:00 GMT", "Thu, 22 Oct 2015 07:28:00 GMT"];
		let versionIndex = 0;
		const server = createServer((request, response) => {
			const etag = `"v${versionIndex + 1}"`;
			const lastModified = lastModifiedVersions[versionIndex] ?? "";
			requestHeaders.push({
				authorization: request.headers.authorization,
				ifModifiedSince: request.headers["if-modified-since"],
				ifNoneMatch: request.headers["if-none-match"],
			});

			if (request.headers["if-none-match"] === etag || request.headers["if-modified-since"] === lastModified) {
				response.setHeader("ETag", etag);
				response.setHeader("Last-Modified", lastModified);
				response.writeHead(304);
				response.end();
				return;
			}

			response.setHeader("Content-Type", "image/png");
			response.setHeader("ETag", etag);
			response.setHeader("Last-Modified", lastModified);
			response.writeHead(200);
			response.end(imageVersions[versionIndex]);
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const address = server.address();
		const port = address && typeof address !== "string" ? address.port : 0;
		const originalWorkingDirectory = process.cwd();
		const fixtureDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cstd-next-remote-image-"));

		try {
			process.chdir(fixtureDirectory);
			vi.stubEnv("NODE_ENV", "development");
			const { loadPrerenderedImage: loadServerPrerenderedImage } = await import("../src/media/image/prerendered-image-runtime.js");
			const src = `http://127.0.0.1:${port}/image.png`;
			const fetchRequestInit = { headers: { authorization: "Bearer fixture-token" } };
			const firstImage = await loadServerPrerenderedImage({ fetchRequestInit, sizes: "1px", src });
			const cachedImage = await loadServerPrerenderedImage({ fetchRequestInit, sizes: "2px", src });
			versionIndex = 1;
			const changedImage = await loadServerPrerenderedImage({ fetchRequestInit, sizes: "3px", src });

			expect(port).toBeGreaterThan(0);
			expect(firstImage.contentHash).toBe(cachedImage.contentHash);
			expect(changedImage.contentHash).not.toBe(firstImage.contentHash);
			expect(requestHeaders).toEqual([
				{ authorization: "Bearer fixture-token", ifModifiedSince: undefined, ifNoneMatch: undefined },
				{ authorization: "Bearer fixture-token", ifModifiedSince: lastModifiedVersions[0], ifNoneMatch: '"v1"' },
				{ authorization: "Bearer fixture-token", ifModifiedSince: lastModifiedVersions[0], ifNoneMatch: '"v1"' },
			]);
		} finally {
			process.chdir(originalWorkingDirectory);
			await new Promise<void>((resolve) => server.close(() => resolve()));
			await fs.rm(fixtureDirectory, { force: true, recursive: true });
		}
	});

	it("caches static-import source bytes for sizes-aware prerendering", async () => {
		const originalWorkingDirectory = process.cwd();
		const fixtureDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cstd-next-image-"));

		try {
			process.chdir(fixtureDirectory);
			vi.stubEnv("NODE_ENV", "development");
			const transformedModule = await staticImageImportLoader.call(
				{
					cacheable: () => undefined,
					resourcePath: path.join(fixtureDirectory, "static.png"),
					resourceQuery: "",
				},
				ONE_PIXEL_PNG,
			);
			const sourceDirectory = path.join(fixtureDirectory, ".next/cache/corioders/cstd-next-local-static-image/source");
			const sourceFiles = await fs.readdir(sourceDirectory);
			const cachedSource = await fs.readFile(path.join(sourceDirectory, sourceFiles[0] ?? ""));
			const transformedSource = JSON.parse(transformedModule.slice("export default ".length)) as StaticImageImport;
			const developmentAssetPath = path.join(fixtureDirectory, "public", transformedSource.developmentAsset?.src.slice(1) ?? "");
			const runtimeAssetPath = path.join(fixtureDirectory, "public", transformedSource.runtimeAsset?.img.src.slice(1) ?? "");
			const developmentAssetMetadata = await sharp(await fs.readFile(developmentAssetPath), { animated: true }).metadata();
			const runtimeAssetMetadata = await sharp(await fs.readFile(runtimeAssetPath), { animated: true }).metadata();

			expect(transformedModule).toContain("export default");
			expect(transformedSource.src).toBe(`cstd-local://${hash(ONE_PIXEL_PNG, createHash)}/static.png`);
			expect(transformedSource.developmentAsset).toEqual({
				height: 1,
				src: `/_cstd/image/asset/development/${hash(ONE_PIXEL_PNG, createHash)}.webp`,
				width: 1,
			});
			expect(developmentAssetMetadata.format).toBe("webp");
			expect(transformedSource.runtimeAsset).toEqual({
				contentHash: hash(ONE_PIXEL_PNG, createHash),
				height: 1,
				img: { src: `/_cstd/image/asset/runtime/${hash(ONE_PIXEL_PNG, createHash)}.webp` },
				width: 1,
			});
			expect(runtimeAssetMetadata.format).toBe("webp");
			expect(sourceFiles).toEqual([hash(ONE_PIXEL_PNG, createHash)]);
			expect(cachedSource).toEqual(ONE_PIXEL_PNG);
		} finally {
			process.chdir(originalWorkingDirectory);
			await fs.rm(fixtureDirectory, { force: true, recursive: true });
		}
	});

	it("cleans production outputs without touching development images", async () => {
		const fixtureDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cstd-next-image-cleanup-"));
		const imageDirectory = path.join(fixtureDirectory, "public/_cstd/image");
		const assetDirectory = path.join(imageDirectory, "asset");
		const descriptorDirectory = path.join(imageDirectory, "descriptor");

		try {
			await fs.mkdir(path.join(assetDirectory, "development"), { recursive: true });
			await fs.mkdir(path.join(assetDirectory, "production"), { recursive: true });
			await fs.mkdir(path.join(descriptorDirectory, "development"), { recursive: true });
			await fs.mkdir(path.join(descriptorDirectory, "production"), { recursive: true });
			await fs.mkdir(path.join(imageDirectory, "remote-descriptor"), { recursive: true });
			await Promise.all([
				fs.writeFile(path.join(assetDirectory, "development/dev.webp"), "development"),
				fs.writeFile(path.join(assetDirectory, "production/prod.webp"), "production"),
				fs.writeFile(path.join(imageDirectory, "hero.hash.640.webp"), "production"),
				fs.writeFile(path.join(imageDirectory, "hero.development.hash.640.webp"), "development"),
				fs.writeFile(path.join(descriptorDirectory, "legacy.json"), "legacy"),
				fs.writeFile(path.join(descriptorDirectory, "development/dev.json"), "development"),
				fs.writeFile(path.join(descriptorDirectory, "production/prod.json"), "production"),
				fs.writeFile(path.join(imageDirectory, "remote-descriptor/legacy.json"), "legacy"),
			]);

			const [_, cleanupError] = await cleanPrerenderedImageProductionOutput(fixtureDirectory);

			expect(cleanupError).toBeNull();
			expect((await fs.readdir(imageDirectory)).sort()).toEqual(["asset", "hero.development.hash.640.webp"]);
			expect((await fs.readdir(assetDirectory)).sort()).toEqual(["development"]);
			expect(await fs.readdir(path.join(assetDirectory, "development"))).toEqual(["dev.webp"]);
		} finally {
			await fs.rm(fixtureDirectory, { force: true, recursive: true });
		}
	});
});

async function optimizeTestImage(imageBuffer: Buffer, filename: string, sizes: string) {
	const files: { data: Buffer; key: string; type: string }[] = [];
	const [descriptor, error] = await optimizeImageBufferInternal({
		baseFilePath: "media",
		baseURL: "/media",
		createHash,
		exportFile: (data, key) => {
			files.push({ data, key, type: `image/${key.slice(key.lastIndexOf(".") + 1)}` });
			return Promise.resolve();
		},
		filename,
		getCache: () => Promise.resolve(null),
		imageBuffer,
		isDevelopmentMode: false,
		setCache: () => Promise.resolve(),
		sharp,
		sizes,
		svgo,
	});

	return [descriptor === null ? null : { descriptor, files }, error] as const;
}
