import { Buffer } from "node:buffer";
import { getPayload } from "payload";
import config from "@payload-config";
import { parseFocalPoints } from "@/lib/gallery-focal";
import { revalidateGallery } from "@/lib/revalidate-public";

const allowedTypes = new Set(["image/webp", "video/mp4", "video/webm", "video/quicktime"]);
const allowedCategories = new Set(["Lato", "Zima", "Szkolenia"]);
const maxTotalBytes = 80 * 1024 * 1024;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nieprawidłowe źródło żądania." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxTotalBytes + 1024 * 1024) {
    return Response.json({ error: "Łączny limit jednego dodawania to 80 MB." }, { status: 413 });
  }

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return Response.json({ error: "Sesja wygasła. Zaloguj się ponownie." }, { status: 401 });

  const data = await request.formData();
  const files = data.getAll("files").filter((value): value is File => value instanceof File);
  const category = String(data.get("category") || "Lato");
  const caption = String(data.get("caption") || "").trim().slice(0, 100);
  const focalPoints = parseFocalPoints(data.get("focalPoints"), files.length);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (!files.length || files.length > 8) return Response.json({ error: "Wybierz od 1 do 8 plików." }, { status: 400 });
  if (!allowedCategories.has(category)) return Response.json({ error: "Nieprawidłowa kategoria." }, { status: 400 });
  if (totalBytes > maxTotalBytes) return Response.json({ error: "Łączny limit jednego dodawania to 80 MB." }, { status: 413 });
  if (files.some((file) => !allowedTypes.has(file.type) || file.size === 0)) return Response.json({ error: "Jeden z plików ma nieobsługiwany format." }, { status: 415 });
  const responsiveFiles = files.map((file, index) => file.type === "image/webp" ? {
    small: data.get(`small-${index}`), medium: data.get(`medium-${index}`),
  } : null);
  if (responsiveFiles.some((variants) => variants && (!(variants.small instanceof File) || variants.small.type !== "image/webp" || variants.small.size === 0 || !(variants.medium instanceof File) || variants.medium.type !== "image/webp" || variants.medium.size === 0))) {
    return Response.json({ error: "Zdjęcia muszą przejść przez optymalizator w uploaderze. Wybierz je ponownie." }, { status: 415 });
  }

  const createdMedia: number[] = [];
  const createdGallery: number[] = [];
  try {
    for (const [index, file] of files.entries()) {
      const fallbackCaption = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "SHOWteam";
      const itemCaption = caption || fallbackCaption;
      const media = await payload.create({
        collection: "media",
        overrideAccess: true,
        data: { alt: itemCaption, focalX: focalPoints[index].x, focalY: focalPoints[index].y },
        file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size },
      });
      createdMedia.push(Number(media.id));
      const video = file.type.startsWith("video/");
      let responsiveSmall: number | undefined;
      let responsiveMedium: number | undefined;
      const variants = responsiveFiles[index];
      if (variants && variants.small instanceof File && variants.medium instanceof File) {
        const small = await payload.create({ collection: "media", overrideAccess: true, data: { alt: itemCaption }, file: { data: Buffer.from(await variants.small.arrayBuffer()), mimetype: variants.small.type, name: variants.small.name, size: variants.small.size } });
        createdMedia.push(Number(small.id));
        responsiveSmall = Number(small.id);
        const medium = await payload.create({ collection: "media", overrideAccess: true, data: { alt: itemCaption }, file: { data: Buffer.from(await variants.medium.arrayBuffer()), mimetype: variants.medium.type, name: variants.medium.name, size: variants.medium.size } });
        createdMedia.push(Number(medium.id));
        responsiveMedium = Number(medium.id);
      }
      const galleryItem = await payload.create({
        collection: "gallery",
        overrideAccess: true,
        data: {
          image: media.id,
          responsiveSmall,
          responsiveMedium,
          caption: itemCaption,
          alt: itemCaption,
          season: category as "Lato" | "Zima" | "Szkolenia",
          layout: video ? "wide" : "square",
          mobileLayout: video ? "landscape" : "square",
          fit: "cover",
          mobilePosition: "same",
          sortOrder: Date.now() + index,
          published: true,
        },
      });
      createdGallery.push(Number(galleryItem.id));
    }
    revalidateGallery();
    return Response.json({ count: files.length });
  } catch (error) {
    await Promise.allSettled(createdGallery.map((id) => payload.delete({ collection: "gallery", id })));
    await Promise.allSettled(createdMedia.map((id) => payload.delete({ collection: "media", id })));
    payload.logger.error({ err: error, msg: "Quick gallery upload failed" });
    return Response.json({ error: "Nie udało się zapisać plików. Spróbuj ponownie." }, { status: 500 });
  }
}
