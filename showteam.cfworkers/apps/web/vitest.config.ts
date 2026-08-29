// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: { include: ["tests/unit/**/*.test.ts"] },
});
