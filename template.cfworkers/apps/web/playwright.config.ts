import { availableParallelism } from "node:os";

import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env["CI"]);
const runIdSuffix = Number(process.env["GITHUB_RUN_ID"]?.slice(-4) ?? 0);
const runAttempt = Number(process.env["GITHUB_RUN_ATTEMPT"] ?? 0);
const port = isCi ? 20_000 + runIdSuffix + runAttempt : 3100;
const localBaseUrl = `http://localhost:${port}`;
const externalBaseUrl = process.env["PLAYWRIGHT_BASE_URL"];
const chromiumExecutablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"];

// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	...(isCi ? { workers: Math.min(4, availableParallelism()) } : {}),
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
					command: `pnpm payload:migrate:local && pnpm payload:seed:local && pnpm start --port ${port}`,
					env: {
						...process.env,
						["CORIODERS_TELEMETRY_DISABLED"]: "1",
						["PAYLOAD_ADMIN_PASSWORD"]: "admin",
						["PAYLOAD_ADMIN_USERNAME"]: "core users",
						["PAYLOAD_COOKIE_SECURE"]: "false",
						["PAYLOAD_SECRET"]: "local-template-secret",
					},
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
