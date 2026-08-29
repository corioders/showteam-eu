/** biome-ignore-all lint/style/useNamingConvention: Environment variables use SCREAMING_SNAKE_CASE. */

import { z } from "zod";

export const cstdBooleanEnvSchema = z
	.enum(["true", "false"])
	.optional()
	.transform((value) => value === "true");

export const cstdTsEnv = {
	server: {
		APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
		CORIODERS_DRIVE_CMS_KEY: z.string().min(1).optional(),
		CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY: z.string().min(1).optional(),
		CORIODERS_INVALIDATE_PERSISTENT_CACHE: cstdBooleanEnvSchema,
	},
	runtimeEnv: {
		APP_ENV: process.env["APP_ENV"],
		CORIODERS_DRIVE_CMS_KEY: process.env["CORIODERS_DRIVE_CMS_KEY"],
		CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY: process.env["CORIODERS_GOOGLE_FILE_UPLOAD_CMS_KEY"],
		CORIODERS_INVALIDATE_PERSISTENT_CACHE: process.env["CORIODERS_INVALIDATE_PERSISTENT_CACHE"],
	},
};
