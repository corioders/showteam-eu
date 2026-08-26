import { afterEach, describe, expect, it, vi } from "vitest";

describe("environment validation", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
		vi.restoreAllMocks();
	});

	it("accepts a known application environment", async () => {
		vi.stubEnv("APP_ENV", "preview");
		vi.stubEnv("CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER", "true");

		const { env } = await import("../../src/env");

		expect(env.APP_ENV).toBe("preview");
		expect(env.CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER).toBe(true);
	});

	it("rejects an unknown application environment", async () => {
		vi.stubEnv("APP_ENV", "staging");
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		await expect(import("../../src/env")).rejects.toThrow("Invalid environment variables");
	});

	it("rejects an invalid cstd boolean", async () => {
		vi.stubEnv("CORIODERS_INVALIDATE_PERSISTENT_CACHE", "yes");
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		await expect(import("../../src/env")).rejects.toThrow("Invalid environment variables");
	});
});
