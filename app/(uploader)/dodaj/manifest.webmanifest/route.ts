export function GET() {
  return Response.json({
    name: "SHOWteam — dodaj do galerii",
    short_name: "SHOWteam Media",
    description: "Szybkie dodawanie zdjęć i filmów do galerii SHOWteam.",
    start_url: "/dodaj",
    scope: "/dodaj",
    display: "standalone",
    background_color: "#080a0b",
    theme_color: "#ff6900",
    lang: "pl",
    icons: [
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "application/manifest+json" } });
}
