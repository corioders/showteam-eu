import { getPayload } from "payload";
import config from "@payload-config";
import { seedEquipment } from "@/lib/seed-equipment";
import { seedGallery } from "@/lib/seed-gallery";
import { seedOffers } from "@/lib/seed-offers";

const payload = await getPayload({ config });
await seedOffers(payload);
await seedGallery(payload);
await seedEquipment(payload);
await payload.destroy();
