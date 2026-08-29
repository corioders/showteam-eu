// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/suspicious/noArrayIndexKey: Legacy SHOWteam behavior is preserved during the structural template migration.
"use client";

import { OptimizedImage } from "cstd-next/media/image/optimized-image.jsx";
import { StaticImage } from "cstd-next/media/image/static-image.jsx";

import { OfferMediaUpload, OfferText, useOfferEditor } from "@/components/editor/offer-inline-editor";
import type { Offer } from "@/lib/offers";
import { resolveStaticImage } from "@/lib/static-images";

type Photo = { src: string; alt: string; fit?: "cover" | "contain"; position?: string };

export function PhotoMosaic({
	photos,
	label = "100% SHOWteam",
	offer,
	labelField,
	imageFields,
}: {
	photos: Photo[];
	label?: string;
	offer?: Offer;
	labelField?: string;
	imageFields?: string[];
}) {
	const editor = useOfferEditor();
	return (
		<section className="border-white/10 border-y bg-black py-4">
			<div className="site-container">
				<div className="mb-4 flex items-center gap-4">
					<span className="font-black font-display text-orange-500 text-xl uppercase">{labelField ? <OfferText field={labelField} fallback={label} /> : label}</span>
					<span className="h-px flex-1 bg-gradient-to-r from-orange-500/70 to-transparent" />
					<span className="font-bold text-[0.65rem] text-white/35 uppercase tracking-[0.25em]">just 4 fun</span>
				</div>
				<div className="grid auto-rows-[14rem] gap-3 sm:grid-cols-2 lg:auto-rows-[18rem] lg:grid-cols-4">
					{photos.map((photo, index) => {
						const field = imageFields?.[index];
						const src = field ? (editor?.value.pageContent[field] ?? photo.src) : photo.src;
						const descriptor = field ? offer?.optimizedMedia?.[field]?.descriptor : undefined;
						const staticImage = resolveStaticImage(src);
						const imageProps = {
							alt: photo.alt,
							className: `absolute inset-0 size-full ${photo.fit === "contain" ? "object-contain" : "object-cover"} ${photo.position ?? "object-center"} transition duration-700 hover:scale-105`,
							loading: "lazy" as const,
							sizes: index === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw",
						};
						return (
							<div
								key={`${field ?? photo.src}-${index}`}
								className={`grain relative overflow-hidden ${index % 3 === 1 ? "gallery-cut-br" : index % 3 === 2 ? "gallery-cut-tl" : ""} ${photo.fit === "contain" ? "bg-white" : "bg-neutral-900"} ${index === 0 ? "sm:col-span-2 lg:row-span-2" : ""}`}
							>
								{descriptor ? <OptimizedImage {...imageProps} src={descriptor} /> : staticImage ? <StaticImage {...imageProps} src={staticImage} /> : null}
								{offer && field ? <OfferMediaUpload offer={offer} field={field} /> : null}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
