import { getGalleryPage, type GalleryPhoto } from "@/lib/gallery";

const seasons = new Set<GalleryPhoto["season"]>(["Lato", "Zima", "Szkolenia"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSeason = searchParams.get("season");
  const season = requestedSeason && seasons.has(requestedSeason as GalleryPhoto["season"])
    ? requestedSeason as GalleryPhoto["season"]
    : undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  return Response.json(await getGalleryPage({ page, limit: 24, season }), {
    headers: { "Cache-Control": "no-store" },
  });
}
