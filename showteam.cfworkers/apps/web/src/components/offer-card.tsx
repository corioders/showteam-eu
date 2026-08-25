import { ArrowUpRight, MapPin } from "lucide-react";
import { OptimizedImage } from "cstd-next/media/image/optimized-image.jsx";
import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import Link from "next/link";

import { OfferEditor } from "@/components/editor/offer-editor";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Offer } from "@/lib/offers";
import { resolveStaticImage } from "@/lib/static-images";
import { cn } from "@/lib/utils";

export function OfferCard({ offer, index, className }: { offer: Offer; index: number; className?: string }) {
	const staticImage = offer.staticImage ?? resolveStaticImage(offer.image);
	const imageProps = { alt: offer.imageAlt, className: "absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.035]", loading: "lazy" as const, sizes: "(min-width:1024px) 58vw, 100vw" };
	return (
		<Card className={cn("poster-cut group relative isolate min-h-[32rem] overflow-hidden rounded-none border-0", className)}>
			{offer.imageDescriptor ? <OptimizedImage {...imageProps} src={offer.imageDescriptor} /> : staticImage ? <StaticImage {...imageProps} src={staticImage} /> : null}
			<div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
			<div className="absolute top-0 left-0 z-[1] flex items-center bg-neutral-950 px-4 py-3 font-bold font-mono text-white/70 text-xs tracking-[0.2em]">
				<span className="mr-3 text-orange-500">0{index + 1}</span> / SHOWteam
			</div>
			<Link
				href={offer.href}
				className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
				aria-label={`${offer.title} — zobacz ofertę`}
			/>
			<OfferEditor offer={offer} compact={true} className="absolute top-4 right-4" />
			<div className="absolute inset-x-0 bottom-0 z-0 p-6 sm:p-8">
				<Badge>{offer.category}</Badge>
				<div className="mt-5 flex items-end justify-between gap-4">
					<div>
						<h3 className="font-black font-display text-4xl uppercase leading-none tracking-tight sm:text-5xl">{offer.title}</h3>
						<p className="mt-3 flex items-center gap-2 text-sm text-white/65">
							<MapPin className="size-4 text-orange-400" /> {offer.location}
						</p>
					</div>
					<span className="grid size-12 shrink-0 place-items-center bg-orange-500 text-black transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
						<ArrowUpRight className="size-5" />
					</span>
				</div>
			</div>
		</Card>
	);
}
