import { createEnv } from "@t3-oss/env-nextjs";
import { cstdNextEnv } from "cstd-next/env.js";

export const env = createEnv({
	emptyStringAsUndefined: true,
	extends: [cstdNextEnv],
	runtimeEnv: {},
	server: {},
});
