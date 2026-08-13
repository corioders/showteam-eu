export function GET() {
  return Response.json({
    id: "/a/dodaj",
    name: "Panel SHOWteam",
    short_name: "SHOWteam",
    description: "Prosty panel wydarzeń, galerii, ofert i rezerwacji SHOWteam.",
    start_url: "/a/dodaj",
    scope: "/a/",
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
