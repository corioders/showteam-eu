import { revalidatePath } from "next/cache";

export function revalidateOffers(slug?: string) {
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/oferta/${slug}`);
  } else {
    revalidatePath("/oferta/[slug]", "page");
  }
}

export function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/galeria");
}
