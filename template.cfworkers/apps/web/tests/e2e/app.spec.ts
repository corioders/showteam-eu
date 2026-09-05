import { expect, test } from "@playwright/test";

test("renders the starter page without browser errors", async ({ page }) => {
	const browserErrors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) {
			browserErrors.push(message.text());
		}
	});
	page.on("pageerror", (error) => browserErrors.push(error.message));

	await page.goto("/", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Build what matters. The platform is ready." })).toBeVisible();
	await expect(page.getByRole("link", { name: "Start building" })).toHaveAttribute("href", "https://nextjs.org/docs/app");
	await expect(page.getByText("pnpm dev", { exact: true })).toBeVisible();
	expect(browserErrors).toEqual([]);
});

test("connects a click and its fetch in one browser trace", async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => {
		const button = document.createElement("button");
		button.textContent = "Telemetry probe";
		button.addEventListener("click", () => fetch("/").then(() => undefined));
		document.body.append(button);
	});

	const telemetryRequest = page.waitForRequest((request) => request.url().endsWith("/api/telemetry/v1/traces"), { timeout: 15_000 });
	await page.getByRole("button", { name: "Telemetry probe" }).click();
	const payload = (await telemetryRequest).postDataJSON() as {
		resourceSpans: Array<{
			scopeSpans: Array<{ spans: Array<{ name: string; parentSpanId?: string; spanId: string; traceId: string }> }>;
		}>;
	};
	const spans = payload.resourceSpans.flatMap((resource) => resource.scopeSpans.flatMap((scope) => scope.spans));
	const clickSpans = spans.filter((span) => span.name.toLowerCase().includes("click"));
	const fetchSpan = spans.find((span) => clickSpans.some((clickSpan) => clickSpan.spanId === span.parentSpanId));
	const parentClickSpan = clickSpans.find((span) => span.spanId === fetchSpan?.parentSpanId);

	expect(parentClickSpan).toBeDefined();
	expect(fetchSpan).toBeDefined();
	expect(fetchSpan?.traceId).toBe(parentClickSpan?.traceId);
});
