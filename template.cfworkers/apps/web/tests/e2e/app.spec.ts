import { expect, type Locator, test } from "@playwright/test";

const AVIF_URL_REGEX = /\.avif$/;
const NON_EMPTY_ATTRIBUTE_REGEX = /.+/;
const RESPONSIVE_CANDIDATE_REGEX = /\s\d+w(?:,|$)/;
const WEBP_URL_REGEX = /\.webp$/;

test("renders responsive images directly and through client-side RSC navigation", async ({ page }) => {
	const browserErrors: string[] = [];
	const descriptorRequests: string[] = [];
	const rscResponses: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) {
			browserErrors.push(message.text());
		}
	});
	page.on("pageerror", (error) => browserErrors.push(error.message));
	page.on("request", (request) => {
		if (request.url().includes("/_cstd/image/descriptor/")) {
			descriptorRequests.push(request.url());
		}
	});
	page.on("response", (response) => {
		if (response.headers()["content-type"]?.includes("text/x-component")) {
			rscResponses.push(response.url());
		}
	});

	await page.goto("/client-navigation", { waitUntil: "networkidle" });
	await expect(page.getByRole("heading", { name: "Client navigation works." })).toBeVisible();
	await assertResponsiveImage(page.getByTestId("client-local-image"), "a.jpeg");
	await assertResponsiveImage(page.getByTestId("client-image"), "image.png");
	await page.getByRole("button", { name: "Test browser image optimizer" }).click();
	await expect(page.getByTestId("browser-image-optimizer-status")).toHaveText("4 files 2x1,4x2 source 4x2", { timeout: 60_000 });

	await page.goto("/", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "It works." })).toBeVisible();
	await assertResponsiveImage(page.getByTestId("server-image"), "a.jpeg");

	await page.getByRole("link", { name: "Test client navigation" }).click();
	await expect(page.getByRole("heading", { name: "Client navigation works." })).toBeVisible();
	await expect(page.getByTestId("client-component-boundary")).toBeVisible();
	await assertResponsiveImage(page.getByTestId("client-local-image"), "a.jpeg");
	await assertResponsiveImage(page.getByTestId("client-image"), "image.png");

	await page.getByRole("link", { name: "Test client page params" }).click();
	await expect(page.getByRole("heading", { name: "Client params fixture: fixture" })).toBeVisible();
	await assertResponsiveImage(page.getByTestId("client-local-image"), "a.jpeg");
	await assertResponsiveImage(page.getByTestId("client-image"), "image.png");

	await page.goto("/simple-client?message=query-props", { waitUntil: "networkidle" });
	await expect(page.getByRole("heading", { name: "Simple client page: query-props" })).toBeVisible();

	expect(rscResponses.length).toBeGreaterThan(0);
	expect(descriptorRequests).toEqual([]);
	expect(browserErrors).toEqual([]);
});

async function assertResponsiveImage(image: Locator, expectedSourceFilename: string) {
	await image.scrollIntoViewIfNeeded();
	await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
	await expect(image).toBeVisible();
	await expect(image).not.toHaveAttribute("data-cstd-prerendered-image", NON_EMPTY_ATTRIBUTE_REGEX);

	const imageState = await image.evaluate((element: HTMLImageElement) => {
		const sources = Array.from(element.parentElement?.querySelectorAll("source") ?? [], (source) => ({ srcSet: source.srcset, type: source.type }));
		return { currentSrc: element.currentSrc, fallbackSrc: element.src, fallbackSrcSet: element.srcset, sources };
	});
	if (imageState.sources.length === 0) {
		expect(imageState.sources).toEqual([]);
		expect(imageState.fallbackSrcSet).toBe("");
		if (imageState.fallbackSrc.includes("/_cstd/image/asset/development/")) {
			expect(imageState.fallbackSrc).toMatch(WEBP_URL_REGEX);
		} else if (!imageState.fallbackSrc.startsWith("data:image/")) {
			expect(decodeURIComponent(new URL(imageState.fallbackSrc).pathname)).toContain(`/${expectedSourceFilename}`);
		}
		expect(imageState.currentSrc).toBe(imageState.fallbackSrc);
		return;
	}

	expect(decodeURIComponent(new URL(imageState.fallbackSrc).pathname)).toContain(`/${expectedSourceFilename}.`);
	expect(imageState.sources.map((source) => source.type)).toEqual(["image/avif"]);
	expect(imageState.sources.every((source) => RESPONSIVE_CANDIDATE_REGEX.test(source.srcSet))).toBe(true);
	expect(imageState.fallbackSrc).toMatch(WEBP_URL_REGEX);
	expect(imageState.fallbackSrcSet).toMatch(RESPONSIVE_CANDIDATE_REGEX);
	expect(imageState.currentSrc).toMatch(AVIF_URL_REGEX);
	expect(imageState.sources[0]?.srcSet).toContain(new URL(imageState.currentSrc).pathname);
}
