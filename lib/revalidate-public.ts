import { revalidatePath } from "next/cache";

export function revalidateOffers() {
  revalidatePath("/");
  revalidatePath("/oferta/[slug]", "page");
}

export function revalidateEvents() {
  revalidatePath("/wydarzenia");
}

export function revalidateNews() {
  revalidatePath("/aktualnosci");
}

export function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/galeria");
}
