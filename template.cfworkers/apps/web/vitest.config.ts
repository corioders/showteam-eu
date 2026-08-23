import { defineConfig } from "vitest/config";

// biome-ignore lint/style/noDefaultExport: Vitest requires a default configuration export.
export default defineConfig({
	test: {
		include: ["tests/unit/**/*.test.ts"],
	},
});
