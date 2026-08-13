import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }, sitemap: "https://www.showteam.eu/sitemap.xml", host: "https://www.showteam.eu" };
}
