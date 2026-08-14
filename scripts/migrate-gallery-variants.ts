import { Buffer } from "node:buffer";
import path from "node:path";
import { getPayload } from "payload";
import sharp from "sharp";
import config from "../payload.config";

const payload = await getPayload({ config });
const gallery = await payload.find({ collection: "gallery", depth: 1, limit: 500, overrideAccess: true });
let migrated = 0;

for (const entry of gallery.docs) {
  const source = typeof entry.image === "object" ? entry.image : null;
  if (!source?.url || !source.mimeType?.startsWith("image/") || (entry.responsiveSmall && entry.responsiveMedium)) continue;
  const response = await fetch(new URL(source.url, "https://showteam-eu.corioders.workers.dev"));
  if (!response.ok) throw new Error(`Nie udało się pobrać ${source.filename}: ${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  const stem = path.basename(source.filename || `gallery-${entry.id}`).replace(/\.[^.]+$/, "");
  const created: number[] = [];
  try {
    const makeVariant = async (width: number, quality: number) => {
      const data = await sharp(original).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality, effort: 5 }).toBuffer();
      const media = await payload.create({ collection: "media", overrideAccess: true, data: { alt: source.alt || entry.alt || entry.caption }, file: { data, mimetype: "image/webp", name: `${stem}-${width}.webp`, size: data.byteLength } });
      created.push(Number(media.id));
      return media.id;
    };
    const responsiveSmall = entry.responsiveSmall || await makeVariant(640, 78);
    const responsiveMedium = entry.responsiveMedium || await makeVariant(1280, 84);
    await payload.update({ collection: "gallery", id: entry.id, overrideAccess: true, data: { responsiveSmall, responsiveMedium } });
    migrated += 1;
  } catch (error) {
    await Promise.allSettled(created.map((id) => payload.delete({ collection: "media", id, overrideAccess: true })));
    throw error;
  }
}

await payload.destroy();
console.log(`Uzupełniono warianty dla ${migrated} wpisów galerii.`);
