// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and test environment variables are runtime bindings.
import config, { database, disposeCloudflareContext } from "@payload-config";
import { getPayload } from "payload";

import { ensureOperationalTables } from "@/lib/operational-tables";
import { seedEquipment } from "@/lib/seed-equipment";
import { seedGallery } from "@/lib/seed-gallery";
import { seedOffers } from "@/lib/seed-offers";

await ensureOperationalTables(database);
const payload = await getPayload({ config });
await seedOffers(payload);
await seedGallery(payload);
await seedEquipment(payload);

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
	const existingAdmin = await payload.find({ collection: "users", where: { email: { equals: adminEmail } }, limit: 1 });
	if (existingAdmin.docs.length === 0) {
		await payload.create({ collection: "users", data: { email: adminEmail, password: adminPassword, name: "Test SHOWteam" } });
	}
}
await payload.destroy();
await disposeCloudflareContext?.();

// Miniflare retains background handles after its explicit disposal in this CLI process.
process.exit(0);
