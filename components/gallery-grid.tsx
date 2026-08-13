"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { GalleryPhoto } from "@/lib/gallery";
import { galleryLayoutClass, galleryMobileClass } from "@/lib/gallery-layout";

const filters = ["Wszystkie", "Lato", "Zima", "Szkolenia"] as const;

export function GalleryGrid({ photos, filtersEnabled = false }: { photos: GalleryPhoto[]; filtersEnabled?: boolean }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Wszystkie");
  const visible = filter === "Wszystkie" ? photos : photos.filter((photo) => photo.season === filter);

  return (
    <>
      {filtersEnabled ? (
        <div className="mb-8 flex flex-wrap border-l border-t border-white/15" aria-label="Filtry galerii">
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className="border-b border-r border-white/15 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white hover:text-black aria-pressed:bg-orange-500 aria-pressed:text-black">
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:auto-rows-[22rem] md:grid-cols-4 md:gap-4">
        {visible.map((photo) => (
          <figure key={photo.id} className={`gallery-tile group relative m-0 overflow-hidden ${galleryMobileClass(photo.mobileLayout)} md:aspect-auto ${photo.fit === "contain" ? "bg-[#ecebe4]" : "bg-neutral-900"} ${galleryLayoutClass(photo.layout)}`}>
            {photo.type === "video" ? (
              <video
                src={photo.src}
                aria-label={photo.alt}
                controls
                playsInline
                preload="metadata"
                className={`gallery-image size-full ${photo.fit === "contain" ? "object-contain" : "object-cover"}`}
                style={{ "--mobile-position": photo.mobilePosition, "--desktop-position": photo.objectPosition } as CSSProperties}
              />
            ) : (
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className={`gallery-image pointer-events-none ${photo.fit === "contain" ? "object-contain" : "object-cover"} transition duration-700 group-hover:scale-[1.025]`}
                style={{ "--mobile-position": photo.mobilePosition, "--desktop-position": photo.objectPosition } as CSSProperties}
                sizes={photo.layout === "large" || photo.layout === "wide" ? "(min-width:768px) 50vw, 100vw" : "(min-width:768px) 25vw, 100vw"}
              />
            )}
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-14 md:translate-y-3 md:opacity-0 md:transition md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
              <p className="font-display text-xl font-black uppercase">{photo.caption}</p>
              {photo.sourceUrl ? <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="relative z-10 mt-2 inline-flex items-center gap-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-orange-400">Źródło <ArrowUpRight className="size-3" /></a> : null}
            </figcaption>
          </figure>
        ))}
      </div>
      {!visible.length ? <p className="border-l-2 border-orange-500 py-2 pl-4 text-white/55">Brak opublikowanych materiałów w tej kategorii.</p> : null}
    </>
  );
}
