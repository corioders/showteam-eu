// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata } from "next";
import { Suspense } from "react";

import { Editable } from "@/components/editor/editable";
import { GalleryUploadEditor } from "@/components/editor/gallery-upload-editor";
import { PageContentEditor } from "@/components/editor/page-content-editor";
import { GalleryGrid } from "@/components/gallery-grid";
import { getGalleryPage } from "@/lib/gallery";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
	title: "Galeria",
	description: "Zdjęcia z letnich i zimowych wyjazdów, szkoleń oraz wydarzeń SHOWteam.",
	alternates: { canonical: "/galeria" },
};

export default function GalleryPage() {
	return (
		<Suspense fallback={null}>
			<GalleryContent />
		</Suspense>
	);
}

async function GalleryContent() {
	const [gallery, pageContent] = await Promise.all([getGalleryPage(), getPageContent("gallery")]);
	return (
		<PageContentEditor page="gallery" initial={pageContent.values} initialMedia={pageContent.media}>
			<section className="pt-32 pb-24 md:pt-40 md:pb-32">
				<div className="gallery-container">
					<div className="mb-12 grid gap-8 border-white/15 border-b pb-10 lg:grid-cols-[1fr_30rem] lg:items-end">
						<div>
							<Editable field="eyebrow" render={<span className="eyebrow" />} />
							<Editable
								field="title"
								multiline={true}
								render={
									<h1 className="mt-4 whitespace-pre-line font-black font-display text-7xl uppercase leading-[0.82] tracking-[-0.055em] sm:text-9xl">
										{pageContent.values.title}
									</h1>
								}
							/>
						</div>
						<div>
							<Editable field="description" render={<p className="max-w-xl text-white/55 leading-7" />} />
							<div className="mt-5">
								<GalleryUploadEditor />
							</div>
						</div>
					</div>
					<GalleryGrid
						key={`${gallery.photos[0]?.id ?? "empty"}-${gallery.photos.length}`}
						photos={gallery.photos}
						filtersEnabled={true}
						initialPage={gallery.page}
						initialTotalPages={gallery.totalPages}
					/>
				</div>
			</section>
		</PageContentEditor>
	);
}
