import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { parseEditableGalleryItem } from "@/lib/editor-gallery";
import { revalidateGallery } from "@/lib/revalidate-public";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const parsed = parseEditableGalleryItem(await request.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ message: "Sprawdź zaznaczone informacje.", errors: parsed.errors }, { status: 400 });
  try {
    const { id } = await params;
    const current = await payload.findByID({ collection: "gallery", id, depth: 0, overrideAccess: false, user });
    const { focalX, focalY, ...galleryData } = parsed.data;
    await payload.update({ collection: "gallery", id, data: { ...galleryData, alt: galleryData.alt || null, sourceUrl: galleryData.sourceUrl || null }, overrideAccess: false, user });
    if (typeof current.image === "number") await payload.update({ collection: "media", id: current.image, data: { alt: galleryData.alt || galleryData.caption, focalX, focalY }, overrideAccess: false, user });
    revalidateGallery();
    return NextResponse.json({ message: "Zmiany zostały opublikowane." });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Visual gallery update failed" });
    return NextResponse.json({ message: "Nie udało się zapisać zmian. Twoje dane nadal są w formularzu." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  try {
    const { id } = await params;
    await payload.delete({ collection: "gallery", id, overrideAccess: false, user });
    revalidateGallery();
    return NextResponse.json({ message: "Materiał został usunięty z galerii." });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Visual gallery delete failed" });
    return NextResponse.json({ message: "Nie udało się usunąć materiału." }, { status: 500 });
  }
}
