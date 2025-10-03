"use server";

import { invalidate as internalInvalidate } from "./invalidate-cache.js";

export async function invalidate() {
	await internalInvalidate();
}
