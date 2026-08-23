import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		// biome-ignore lint/style/useNamingConvention: Environment variables use SCREAMING_SNAKE_CASE.
		APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
	},
	runtimeEnv: {
		// biome-ignore lint/style/useNamingConvention: Environment variables use SCREAMING_SNAKE_CASE.
		APP_ENV: process.env["APP_ENV"],
	},
	emptyStringAsUndefined: true,
});
