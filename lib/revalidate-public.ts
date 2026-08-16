import { revalidatePath } from "next/cache";
import type { PageContentName } from "./page-content-schema";

const categoryPaths: Record<string, string> = { Lato: "/oferta/lato", Zima: "/oferta/zima", Szkolenia: "/oferta/szkolenia", Noclegi: "/oferta/noclegi-nad-woda" };

export function revalidateOffers(slug?: string, category?: string) {
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/oferta/${slug}`);
  } else {
    revalidatePath("/oferta/[slug]", "page");
  }
  const categoryPath = category ? categoryPaths[category] : undefined;
  if (categoryPath && categoryPath !== `/oferta/${slug}`) revalidatePath(categoryPath);
}

export function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/galeria");
}

const pageContentPaths: Record<PageContentName, string[]> = {
  home: ["/"],
  contact: ["/kontakt"],
  gallery: ["/", "/galeria"],
  reservations: ["/rezerwacje"],
};

export function revalidatePageContent(page: PageContentName) {
  for (const path of pageContentPaths[page]) revalidatePath(path);
}
