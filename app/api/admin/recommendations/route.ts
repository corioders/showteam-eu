import { getPayload } from "payload";
import config from "@payload-config";

const profiles = new Set(["any", "calm", "wind"]);
const validTime = (value: string) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

async function adminPayload(request: Request) {
  const payload = await getPayload({ config });
  return (await payload.auth({ headers: request.headers })).user ? payload : null;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const payload = await adminPayload(request);
  if (!payload) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const result = await payload.find({ collection: "equipment", overrideAccess: true, limit: 100, sort: "sortOrder" });
  return Response.json({ equipment: result.docs.map((item) => ({
    id: Number(item.id), name: item.name, weatherProfile: item.weatherProfile,
    recommendedStart1: item.recommendedStart1 || "", recommendedEnd1: item.recommendedEnd1 || "",
    recommendedStart2: item.recommendedStart2 || "", recommendedEnd2: item.recommendedEnd2 || "",
    windMediumMinKmh: item.windMediumMinKmh, windMediumMaxKmh: item.windMediumMaxKmh,
    windBestMinKmh: item.windBestMinKmh, windBestMaxKmh: item.windBestMaxKmh,
    professionalWindMinKmh: item.professionalWindMinKmh ?? "",
    recommendationNote: item.recommendationNote || "",
  })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Odśwież panel i spróbuj ponownie." }, { status: 403 });
  const payload = await adminPayload(request);
  if (!payload) return Response.json({ error: "Sesja wygasła. Zaloguj się ponownie." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = Number(input.id);
  const weatherProfile = String(input.weatherProfile || "");
  const recommendedStart1 = String(input.recommendedStart1 || "");
  const recommendedEnd1 = String(input.recommendedEnd1 || "");
  const recommendedStart2 = String(input.recommendedStart2 || "");
  const recommendedEnd2 = String(input.recommendedEnd2 || "");
  const windMediumMinKmh = Number(input.windMediumMinKmh);
  const windMediumMaxKmh = Number(input.windMediumMaxKmh);
  const windBestMinKmh = Number(input.windBestMinKmh);
  const windBestMaxKmh = Number(input.windBestMaxKmh);
  const professionalWindMinKmh = input.professionalWindMinKmh === "" || input.professionalWindMinKmh == null ? null : Number(input.professionalWindMinKmh);
  const recommendationNote = String(input.recommendationNote || "").trim();
  const windows = [[recommendedStart1, recommendedEnd1], [recommendedStart2, recommendedEnd2]];
  if (!Number.isInteger(id)) return Response.json({ error: "Nie znaleziono sprzętu." }, { status: 400 });
  if (!profiles.has(weatherProfile)) return Response.json({ error: "Wybierz rodzaj warunków." }, { status: 400 });
  if (recommendationNote.length > 220) return Response.json({ error: "Podpowiedź może mieć maksymalnie 220 znaków." }, { status: 400 });
  if (![windMediumMinKmh, windMediumMaxKmh, windBestMinKmh, windBestMaxKmh].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
    return Response.json({ error: "Wpisz prędkości wiatru od 0 do 100 km/h." }, { status: 400 });
  }
  if (!(windMediumMinKmh <= windBestMinKmh && windBestMinKmh <= windBestMaxKmh && windBestMaxKmh <= windMediumMaxKmh)) {
    return Response.json({ error: "Zakres „najlepszy” musi mieścić się wewnątrz zakresu „średni”." }, { status: 400 });
  }
  if (weatherProfile === "wind" && professionalWindMinKmh != null && (!Number.isFinite(professionalWindMinKmh) || professionalWindMinKmh < 0 || professionalWindMinKmh > 100 || professionalWindMinKmh <= windBestMaxKmh)) {
    return Response.json({ error: "Próg profesjonalny musi być wyższy niż najlepszy warun i nie większy niż 100 km/h." }, { status: 400 });
  }
  for (const [start, end] of windows) {
    if (!validTime(start) || !validTime(end) || Boolean(start) !== Boolean(end) || (start && start >= end)) return Response.json({ error: "W każdym oknie wpisz poprawny początek i koniec albo zostaw oba pola puste." }, { status: 400 });
  }
  try {
    await payload.update({ collection: "equipment", id, overrideAccess: true, data: {
      weatherProfile: weatherProfile as "any" | "calm" | "wind",
      recommendedStart1: recommendedStart1 || null, recommendedEnd1: recommendedEnd1 || null,
      recommendedStart2: recommendedStart2 || null, recommendedEnd2: recommendedEnd2 || null,
      windMediumMinKmh, windMediumMaxKmh, windBestMinKmh, windBestMaxKmh,
      professionalWindMinKmh: weatherProfile === "wind" ? professionalWindMinKmh : null,
      recommendationNote: recommendationNote || null,
    } });
    return Response.json({ ok: true });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Equipment recommendation update failed" });
    return Response.json({ error: "Nie udało się zapisać podpowiedzi. Sprawdź godziny i spróbuj ponownie." }, { status: 400 });
  }
}
