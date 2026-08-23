import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const localBaseUrl = `http://localhost:${port}`;
const externalBaseUrl = process.env["PLAYWRIGHT_BASE_URL"];
const isCi = Boolean(process.env["CI"]);

// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	workers: 1,
	retries: isCi ? 1 : 0,
	reporter: "line",
	use: {
		baseURL: externalBaseUrl ?? localBaseUrl,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	...(externalBaseUrl
		? {}
		: {
				webServer: {
					command: isCi ? `pnpm start --port ${port}` : `pnpm dev --port ${port}`,
					url: localBaseUrl,
					reuseExistingServer: !isCi,
					timeout: 120_000,
				},
			}),
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
