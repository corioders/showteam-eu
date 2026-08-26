/** biome-ignore-all lint/style/useNamingConvention: Environment variables use SCREAMING_SNAKE_CASE. */

import { createEnv } from "@t3-oss/env-nextjs";
import { cstdBooleanEnvSchema, cstdTsEnv } from "cstd-ts/env.js";

export const cstdNextEnv = createEnv({
	emptyStringAsUndefined: true,
	server: {
		...cstdTsEnv.server,
		CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER: cstdBooleanEnvSchema,
	},
	runtimeEnv: {
		...cstdTsEnv.runtimeEnv,
		CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER: process.env["CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER"],
	},
});
