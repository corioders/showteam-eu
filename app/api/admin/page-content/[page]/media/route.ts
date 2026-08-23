import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { isPageContentName, pageContentDefaults, parsePageContent } from "@/lib/page-content-schema";
import { revalidatePageContent } from "@/lib/revalidate-public";

const imageTypes = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export async function POST(request: Request, { params }: { params: Promise<{ page: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });

  const { page } = await params;
  if (!isPageContentName(page)) return NextResponse.json({ message: "Nieznana strona." }, { status: 404 });
  const form = await request.formData();
  const field = String(form.get("field"));
  const file = form.get("file");
  const defaultValue = pageContentDefaults[page][field as keyof typeof pageContentDefaults[typeof page]];
  const kind = field.endsWith("VideoUrl") ? "video" : field.endsWith("ImageUrl") || field.endsWith("PosterUrl") ? "image" : undefined;
  const acceptedTypes = kind === "image" ? imageTypes : videoTypes;
  if (typeof defaultValue !== "string" || !kind || !(file instanceof File) || file.size === 0 || file.size > 80 * 1024 * 1024 || !acceptedTypes.has(file.type)) {
    return NextResponse.json({ message: "Wybierz obsługiwane zdjęcie lub film do 80 MB." }, { status: 400 });
  }

  let mediaId: number | undefined;
  try {
    const existing = await payload.find({ collection: "page-content", where: { page: { equals: page } }, limit: 1, depth: 0, overrideAccess: true });
    const current = existing.docs[0]?.content && typeof existing.docs[0].content === "object" && !Array.isArray(existing.docs[0].content) ? existing.docs[0].content as Record<string, string> : {};
    const media = await payload.create({ collection: "media", overrideAccess: true, data: { alt: kind === "video" ? "Film na stronie SHOWteam" : "Zdjęcie na stronie SHOWteam" }, file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size } });
    mediaId = Number(media.id);
    const parsed = parsePageContent(page, { ...pageContentDefaults[page], ...current, [field]: media.url });
    if (!parsed.data) throw new Error(parsed.errors?.[0]);
    if (existing.docs[0]) await payload.update({ collection: "page-content", id: existing.docs[0].id, data: { content: parsed.data }, overrideAccess: false, user });
    else await payload.create({ collection: "page-content", data: { page, content: parsed.data }, overrideAccess: false, user });
    revalidatePageContent(page);
    return NextResponse.json({ url: media.url, message: "Plik jest już widoczny na stronie." });
  } catch (error) {
    if (mediaId) await payload.delete({ collection: "media", id: mediaId, overrideAccess: true }).catch(() => undefined);
    payload.logger.error({ err: error, msg: "Inline page media upload failed" });
    return NextResponse.json({ message: "Nie udało się wysłać pliku. Wybierz go ponownie." }, { status: 500 });
  }
}
