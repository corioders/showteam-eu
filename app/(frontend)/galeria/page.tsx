import type { Metadata } from "next";
import { GalleryGrid } from "@/components/gallery-grid";
import { getGalleryPage } from "@/lib/gallery";
import { GalleryUploadEditor } from "@/components/editor/gallery-upload-editor";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Galeria",
  description: "Zdjęcia z letnich i zimowych wyjazdów, szkoleń oraz wydarzeń SHOWteam.",
  alternates: { canonical: "/galeria" },
};

export default async function GalleryPage() {
  const gallery = await getGalleryPage();
  return (
    <section className="pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="gallery-container">
        <div className="mb-12 grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[1fr_30rem] lg:items-end">
          <div><span className="eyebrow">Bez stocków. Prosto z akcji.</span><h1 className="font-display mt-4 text-7xl font-black uppercase leading-[0.82] tracking-[-0.055em] sm:text-9xl">Galeria<br /><span className="text-orange-500">SHOWteam.</span></h1></div>
          <div><p className="max-w-xl leading-7 text-white/55">Jezioro Łąckie, Dolomity i Andorra — obozy, wyjazdy i codzienność SHOWteam uchwycone w akcji.</p><div className="mt-5"><GalleryUploadEditor /></div></div>
        </div>
        <GalleryGrid key={`${gallery.photos[0]?.id ?? "empty"}-${gallery.photos.length}`} photos={gallery.photos} filtersEnabled initialPage={gallery.page} initialTotalPages={gallery.totalPages} />
      </div>
    </section>
  );
}
