// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/", disallow: ["/a/", "/admin/", "/api/"] },
		sitemap: "https://www.showteam.eu/sitemap.xml",
		host: "https://www.showteam.eu",
	};
}
