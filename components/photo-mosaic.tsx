"use client";

import Image from "next/image";
import { OfferMediaUpload, OfferText, useOfferEditor } from "@/components/editor/offer-inline-editor";
import type { Offer } from "@/lib/offers";

type Photo = { src: string; alt: string; fit?: "cover" | "contain"; position?: string };

export function PhotoMosaic({ photos, label = "100% SHOWteam", offer, labelField, imageFields }: { photos: Photo[]; label?: string; offer?: Offer; labelField?: string; imageFields?: string[] }) {
  const editor = useOfferEditor();
  return (
    <section className="border-y border-white/10 bg-black py-4">
      <div className="site-container">
        <div className="mb-4 flex items-center gap-4">
          <span className="font-display text-xl font-black uppercase text-orange-500">{labelField ? <OfferText field={labelField} fallback={label} /> : label}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-orange-500/70 to-transparent" />
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/35">just 4 fun</span>
        </div>
        <div className="grid auto-rows-[14rem] gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[18rem]">
          {photos.map((photo, index) => {
            const field = imageFields?.[index];
            const src = field ? editor?.value.pageContent[field] ?? photo.src : photo.src;
            return <div key={`${field ?? photo.src}-${index}`} className={`grain relative overflow-hidden ${index % 3 === 1 ? "gallery-cut-br" : index % 3 === 2 ? "gallery-cut-tl" : ""} ${photo.fit === "contain" ? "bg-white" : "bg-neutral-900"} ${index === 0 ? "sm:col-span-2 lg:row-span-2" : ""}`}>
              <Image src={src} alt={photo.alt} fill className={`${photo.fit === "contain" ? "object-contain" : "object-cover"} ${photo.position ?? "object-center"} transition duration-700 hover:scale-105`} sizes={index === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} />
              {offer && field ? <OfferMediaUpload offer={offer} field={field} /> : null}
            </div>
          })}
        </div>
      </div>
    </section>
  );
}
