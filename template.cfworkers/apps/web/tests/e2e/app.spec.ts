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
