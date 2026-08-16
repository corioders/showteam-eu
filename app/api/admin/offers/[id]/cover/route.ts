import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { revalidateOffers } from "@/lib/revalidate-public";

const allowedTypes = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"]);
const maxBytes = 15 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size === 0 || file.size > maxBytes) {
    return NextResponse.json({ message: "Wybierz zdjęcie JPG, PNG, AVIF lub WebP do 15 MB." }, { status: 400 });
  }

  let mediaId: number | undefined;
  try {
    const { id } = await params;
    const offer = await payload.findByID({ collection: "offers", id, depth: 0, overrideAccess: false, user });
    const media = await payload.create({
      collection: "media",
      overrideAccess: true,
      data: { alt: `Zdjęcie okładkowe — ${offer.title}` },
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size },
    });
    mediaId = Number(media.id);
    await payload.update({ collection: "offers", id, data: { cover: media.id }, overrideAccess: false, user });
    revalidateOffers(offer.slug, offer.category);
    return NextResponse.json({ url: media.url, message: "Zdjęcie jest już widoczne na stronie." });
  } catch (error) {
    if (mediaId) await payload.delete({ collection: "media", id: mediaId, overrideAccess: true }).catch(() => undefined);
    payload.logger.error({ err: error, msg: "Inline offer cover upload failed" });
    return NextResponse.json({ message: "Nie udało się zmienić zdjęcia. Wybierz je ponownie." }, { status: 500 });
  }
}
