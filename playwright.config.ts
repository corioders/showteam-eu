import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const ciPort = 3100 + (Number(process.env.GITHUB_RUN_ID?.slice(-3) || 0) % 1000);
const testPort = process.env.CI ? ciPort : 3000;
const localBaseUrl = `http://localhost:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  retries: 1,
  reporter: "line",
  use: {
    baseURL: externalBaseUrl || localBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl ? undefined : {
    command: process.env.CI ? `pnpm start --port ${testPort}` : "pnpm dev",
    url: localBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
