import { afterEach, describe, expect, it, vi } from "vitest";

describe("environment validation", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
		vi.restoreAllMocks();
	});

	it("accepts a known application environment", async () => {
		vi.stubEnv("APP_ENV", "preview");

		const { env } = await import("../../src/env");

		expect(env.APP_ENV).toBe("preview");
	});

	it("rejects an unknown application environment", async () => {
		vi.stubEnv("APP_ENV", "staging");
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		await expect(import("../../src/env")).rejects.toThrow("Invalid environment variables");
	});
});
