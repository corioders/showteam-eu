import config from "@payload-config";
import { getPayload } from "payload";

import { seedEquipment } from "@/lib/seed-equipment";
import { seedGallery } from "@/lib/seed-gallery";
import { seedOffers } from "@/lib/seed-offers";

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
