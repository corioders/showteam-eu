import { Buffer } from "node:buffer";
import { getPayload } from "payload";
import config from "@payload-config";
import { revalidateEvents } from "@/lib/revalidate-public";

const categories = new Set(["Lato", "Zima", "Szkolenia", "Inne"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxImageBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return Response.json({ error: "Sesja wygasła. Zaloguj się ponownie." }, { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const startDate = String(form.get("startDate") || "");
  const endDate = String(form.get("endDate") || "");
  const location = String(form.get("location") || "").trim();
  const summary = String(form.get("summary") || "").trim();
  const category = String(form.get("category") || "Lato");
  const image = form.get("image");

  if (title.length < 2) return Response.json({ field: "title", error: "Wpisz nazwę wydarzenia." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return Response.json({ field: "startDate", error: "Wybierz datę rozpoczęcia." }, { status: 400 });
  if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)) return Response.json({ field: "endDate", error: "Data zakończenia nie może być wcześniejsza niż rozpoczęcie." }, { status: 400 });
  if (location.length < 2) return Response.json({ field: "location", error: "Wpisz miejsce wydarzenia." }, { status: 400 });
  if (summary.length < 10) return Response.json({ field: "summary", error: "Napisz krótki opis — minimum 10 znaków." }, { status: 400 });
  if (!categories.has(category)) return Response.json({ field: "category", error: "Wybierz poprawną kategorię." }, { status: 400 });
  if (!(image instanceof File) || !image.size) return Response.json({ field: "image", error: "Dodaj zdjęcie tego wydarzenia." }, { status: 400 });
  if (!imageTypes.has(image.type)) return Response.json({ field: "image", error: "Zdjęcie musi być plikiem JPG, PNG, WebP lub AVIF." }, { status: 415 });
  if (image.size > maxImageBytes) return Response.json({ field: "image", error: "Zdjęcie jest za duże. Maksymalny rozmiar to 15 MB." }, { status: 413 });

  let mediaId: number | null = null;
  try {
    const media = await payload.create({
      collection: "media",
      data: { alt: title },
      file: { data: Buffer.from(await image.arrayBuffer()), mimetype: image.type, name: image.name, size: image.size },
    });
    mediaId = Number(media.id);
    await payload.create({
      collection: "events",
      data: {
        title,
        startDate: `${startDate}T12:00:00.000Z`,
        endDate: endDate ? `${endDate}T12:00:00.000Z` : null,
        location,
        summary,
        category: category as "Lato" | "Zima" | "Szkolenia" | "Inne",
        image: media.id,
        ctaLabel: "Zapytaj o miejsce",
        published: true,
      },
    });
    revalidateEvents();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (mediaId !== null) await payload.delete({ collection: "media", id: mediaId }).catch(() => undefined);
    payload.logger.error({ err: error, msg: "Quick event creation failed" });
    return Response.json({ error: "Nie udało się zapisać wydarzenia. Nic nie zostało opublikowane — spróbuj ponownie." }, { status: 500 });
  }
}
