"use server";

import { invalidate } from "@/driveCMS/cache.js";

export async function invalidateDriveCMS() {
	invalidate();
}
