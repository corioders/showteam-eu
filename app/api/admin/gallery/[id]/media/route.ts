import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { revalidateGallery } from "@/lib/revalidate-public";

const allowedTypes = new Set(["image/webp", "video/mp4", "video/webm", "video/quicktime"]);
const maxBytes = 80 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size === 0 || file.size > maxBytes) return NextResponse.json({ message: "Wybierz obsługiwane zdjęcie lub film do 80 MB." }, { status: 400 });
  const image = file.type === "image/webp";
  const small = form.get("small");
  const medium = form.get("medium");
  if (image && (!(small instanceof File) || small.type !== "image/webp" || !(medium instanceof File) || medium.type !== "image/webp")) return NextResponse.json({ message: "Zdjęcie nie przeszło optymalizacji. Wybierz je ponownie." }, { status: 400 });

  const created: number[] = [];
  try {
    const { id } = await params;
    const item = await payload.findByID({ collection: "gallery", id, depth: 0, overrideAccess: false, user });
    const makeMedia = async (source: File) => {
      const media = await payload.create({ collection: "media", overrideAccess: true, data: { alt: item.alt || item.caption }, file: { data: Buffer.from(await source.arrayBuffer()), mimetype: source.type, name: source.name, size: source.size } });
      created.push(Number(media.id));
      return media;
    };
    const main = await makeMedia(file);
    const smallMedia = image ? await makeMedia(small as File) : null;
    const mediumMedia = image ? await makeMedia(medium as File) : null;
    await payload.update({ collection: "gallery", id, overrideAccess: true, data: { image: main.id, responsiveSmall: smallMedia?.id ?? null, responsiveMedium: mediumMedia?.id ?? null } });
    const oldIds = [item.image, item.responsiveSmall, item.responsiveMedium].filter((value): value is number => typeof value === "number" && !created.includes(value));
    await Promise.allSettled(oldIds.map((mediaId) => payload.delete({ collection: "media", id: mediaId, overrideAccess: true })));
    revalidateGallery();
    return NextResponse.json({ message: "Nowy plik jest już widoczny w galerii." });
  } catch (error) {
    await Promise.allSettled(created.map((mediaId) => payload.delete({ collection: "media", id: mediaId, overrideAccess: true })));
    payload.logger.error({ err: error, msg: "Inline gallery media replacement failed" });
    return NextResponse.json({ message: "Nie udało się wymienić pliku. Wybierz go ponownie." }, { status: 500 });
  }
}
