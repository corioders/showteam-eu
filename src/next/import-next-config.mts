import { CORIODERS_INVALIDATE_PERSISTENT_CACHE } from "@/const.js";

import { invalidate } from "./invalidate-cache.js";

export async function runOnceOnNextStartup() {
	if (!CORIODERS_INVALIDATE_PERSISTENT_CACHE) {
		return;
	}

	await invalidate();
}
