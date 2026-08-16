const IMAGE_VARIANTS = [{ key: "small", edge: 640, quality: 0.78 }, { key: "medium", edge: 1280, quality: 0.84 }, { key: "large", edge: 2560, quality: 0.9 }] as const;

export async function createPhotoVariants(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const entries = await Promise.all(IMAGE_VARIANTS.map(async ({ key, edge, quality }) => [key, await renderWebP(bitmap, file, edge, quality)] as const));
    return Object.fromEntries(entries) as Record<(typeof IMAGE_VARIANTS)[number]["key"], File>;
  } finally {
    bitmap.close();
  }
}

async function renderWebP(bitmap: ImageBitmap, source: File, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Nie udało się przygotować zdjęcia. Wybierz je ponownie.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Ta przeglądarka nie potrafi przygotować WebP. Zaktualizuj ją i spróbuj ponownie.");
  return new File([blob], source.name.replace(/\.[^.]+$/, `-${maxEdge}.webp`), { type: "image/webp", lastModified: source.lastModified });
}
