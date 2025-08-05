'use server';

import { invalidate } from '@/driveCMS/cache.js';

// biome-ignore lint/suspicious/useAwait: server actions require this function to be async
export async function invalidateDriveCMS() {
	invalidate();
}
