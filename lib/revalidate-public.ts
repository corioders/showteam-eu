import { revalidatePath } from "next/cache";

export function revalidateOffers() {
  revalidatePath("/");
  revalidatePath("/oferta/[slug]", "page");
}

export function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/galeria");
}
