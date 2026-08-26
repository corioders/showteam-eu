import { invalidateDriveCMS } from "@/driveCMS/cache.js";

export async function invalidate() {
	await invalidateDriveCMS();
}
