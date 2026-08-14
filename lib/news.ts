import { getPayload } from "payload";
import config from "@payload-config";

export type PublicNews = { id: string; title: string; publicationDate: string; summary: string; content: string; category: string; image: string; imageAlt: string };

export async function getNews(): Promise<PublicNews[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({ collection: "news", where: { published: { equals: true } }, sort: "-publicationDate", depth: 1, limit: 100 });
  return result.docs.flatMap((document) => {
    const image = document.image as { url?: string; alt?: string } | null;
    if (!image?.url) return [];
    return [{
      id: String(document.id),
      title: document.title,
      publicationDate: document.publicationDate,
      summary: document.summary,
      content: document.content,
      category: document.category,
      image: image.url,
      imageAlt: image.alt || document.title,
    }];
  });
}
