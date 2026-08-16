import type { Metadata } from "next";
import { GalleryGrid } from "@/components/gallery-grid";
import { getGalleryPage } from "@/lib/gallery";
import { GalleryUploadEditor } from "@/components/editor/gallery-upload-editor";
import { EditableText, PageContentEditor } from "@/components/editor/page-content-editor";
import { getPageContent } from "@/lib/page-content";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Galeria",
  description: "Zdjęcia z letnich i zimowych wyjazdów, szkoleń oraz wydarzeń SHOWteam.",
  alternates: { canonical: "/galeria" },
};

export default async function GalleryPage() {
  const [gallery, pageContent] = await Promise.all([getGalleryPage(), getPageContent("gallery")]);
  return (
    <PageContentEditor page="gallery" initial={pageContent.values}>
    <section className="pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="gallery-container">
        <div className="mb-12 grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[1fr_30rem] lg:items-end">
          <div><span className="eyebrow"><EditableText field="eyebrow" /></span><h1 className="font-display mt-4 whitespace-pre-line text-7xl font-black uppercase leading-[0.82] tracking-[-0.055em] sm:text-9xl"><EditableText field="title" multiline /></h1></div>
          <div><p className="max-w-xl leading-7 text-white/55"><EditableText field="description" multiline /></p><div className="mt-5"><GalleryUploadEditor /></div></div>
        </div>
        <GalleryGrid key={`${gallery.photos[0]?.id ?? "empty"}-${gallery.photos.length}`} photos={gallery.photos} filtersEnabled initialPage={gallery.page} initialTotalPages={gallery.totalPages} />
      </div>
    </section>
    </PageContentEditor>
  );
}
