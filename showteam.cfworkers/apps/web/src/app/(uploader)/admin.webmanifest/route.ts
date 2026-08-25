// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
export function GET() {
	return Response.json(
		{
			id: "/admin",
			name: "Panel SHOWteam",
			short_name: "SHOWteam",
			description: "Panel wydarzeń, galerii, ofert i rezerwacji SHOWteam.",
			start_url: "/admin",
			scope: "/",
			display: "standalone",
			background_color: "#f7f7f4",
			theme_color: "#ff6900",
			lang: "pl",
			icons: [
				{ src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
				{ src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
			],
		},
		{ headers: { "Content-Type": "application/manifest+json" } },
	);
}
