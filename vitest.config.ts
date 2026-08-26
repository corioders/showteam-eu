import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// biome-ignore lint/style/noDefaultExport: Vitest requires a default configuration export.
export default defineConfig({
	oxc: {
		jsx: {
			runtime: "automatic",
		},
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
	},
});
