import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { revalidateEquipment } from "@/lib/revalidate-public";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "image/webp" || file.size === 0 || file.size > 15 * 1024 * 1024) return NextResponse.json({ message: "Wybierz zdjęcie do 15 MB." }, { status: 400 });
  let createdId: number | undefined;
  try {
    const { id } = await params;
    const equipment = await payload.findByID({ collection: "equipment", id, depth: 0, overrideAccess: false, user });
    const media = await payload.create({ collection: "media", overrideAccess: true, data: { alt: equipment.name }, file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size } });
    createdId = Number(media.id);
    await payload.update({ collection: "equipment", id, data: { image: media.id }, overrideAccess: false, user });
    if (typeof equipment.image === "number" && equipment.image !== createdId) await payload.delete({ collection: "media", id: equipment.image, overrideAccess: true }).catch(() => undefined);
    revalidateEquipment();
    return NextResponse.json({ message: "Zdjęcie sprzętu jest już widoczne." });
  } catch (error) {
    if (createdId) await payload.delete({ collection: "media", id: createdId, overrideAccess: true }).catch(() => undefined);
    payload.logger.error({ err: error, msg: "Inline equipment image upload failed" });
    return NextResponse.json({ message: "Nie udało się zmienić zdjęcia. Wybierz je ponownie." }, { status: 500 });
  }
}
