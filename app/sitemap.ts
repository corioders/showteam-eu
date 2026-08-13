import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.showteam.eu";
  return ["", "/oferta/lato", "/oferta/zima", "/oferta/szkolenia", "/wydarzenia", "/galeria", "/kontakt"].map((path, index) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: index === 0 || path === "/wydarzenia" ? "weekly" : "monthly", priority: index === 0 ? 1 : path.startsWith("/oferta") ? 0.9 : 0.7 }));
}
