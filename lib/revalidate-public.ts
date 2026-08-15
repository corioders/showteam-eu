import { revalidatePath } from "next/cache";

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
