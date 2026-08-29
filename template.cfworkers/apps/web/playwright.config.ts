import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const localBaseUrl = `http://localhost:${port}`;
const externalBaseUrl = process.env["PLAYWRIGHT_BASE_URL"];
const chromiumExecutablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"];
const isCi = Boolean(process.env["CI"]);

// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	...(isCi ? { workers: 2 } : {}),
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
					command: `pnpm start --port ${port}`,
					url: localBaseUrl,
					reuseExistingServer: false,
					timeout: 120_000,
				},
			}),
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
			},
		},
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
