import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.showteam.eu";
  return ["", "/oferta/lato", "/oferta/zima", "/oferta/szkolenia", "/oferta/noclegi-nad-woda", "/zgloszenie", "/rezerwacje", "/zorganizuj-impreze", "/galeria", "/kontakt"].map((path, index) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: index === 0 || path === "/rezerwacje" ? "weekly" : "monthly", priority: index === 0 ? 1 : path.startsWith("/oferta") || path === "/rezerwacje" || path === "/zorganizuj-impreze" ? 0.9 : 0.7 }));
}
