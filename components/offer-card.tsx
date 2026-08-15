import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Offer } from "@/lib/offers";
import { cn } from "@/lib/utils";
import { OfferEditor } from "@/components/editor/offer-editor";

export function OfferCard({ offer, index, className }: { offer: Offer; index: number; className?: string }) {
  return (
    <Card className={cn("poster-cut group relative isolate min-h-[32rem] overflow-hidden rounded-none border-0", className)}>
      <Image src={offer.image} alt={offer.imageAlt} fill className="object-cover transition duration-700 group-hover:scale-[1.035]" sizes="(min-width:1024px) 58vw, 100vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      <div className="absolute left-0 top-0 z-[1] flex items-center bg-neutral-950 px-4 py-3 font-mono text-xs font-bold tracking-[0.2em] text-white/70">
        <span className="mr-3 text-orange-500">0{index + 1}</span> / SHOWteam
      </div>
      <Link href={offer.href} className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500" aria-label={`${offer.title} — zobacz ofertę`} />
      <OfferEditor offer={offer} compact className="absolute right-4 top-4" />
      <div className="absolute inset-x-0 bottom-0 z-0 p-6 sm:p-8">
        <Badge>{offer.category}</Badge>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">{offer.title}</h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/65"><MapPin className="size-4 text-orange-400" /> {offer.location}</p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center bg-orange-500 text-black transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"><ArrowUpRight className="size-5" /></span>
        </div>
      </div>
    </Card>
  );
}
