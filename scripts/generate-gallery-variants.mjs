import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("public/media");
const outputDirectory = path.join(sourceDirectory, "responsive");
const variants = [{ width: 640, quality: 78 }, { width: 1280, quality: 84 }, { width: 2560, quality: 90 }];
const supported = /\.(avif|jpe?g|png|webp)$/i;

await mkdir(outputDirectory, { recursive: true });
const files = (await readdir(sourceDirectory, { withFileTypes: true })).filter((entry) => entry.isFile() && supported.test(entry.name));

for (const file of files) {
  const stem = file.name.replace(/\.[^.]+$/, "");
  await Promise.all(variants.map(({ width, quality }) => sharp(path.join(sourceDirectory, file.name))
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(path.join(outputDirectory, `${stem}-${width}.webp`))));
}

console.log(`Wygenerowano warianty WebP dla ${files.length} zdjęć.`);
