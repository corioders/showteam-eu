import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowDownRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PageHero({ eyebrow, title, description, location, image, imageAlt }: { eyebrow: string; title: string; description: string; location: string; image: string; imageAlt: string }) {
  return (
    <section className="grain relative min-h-[82vh] overflow-hidden pt-20">
      <Image src={image} alt={imageAlt} fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
      <div className="site-container relative flex min-h-[calc(82vh-5rem)] items-end py-12 md:py-20">
        <div className="max-w-4xl">
          <Button asChild variant="outline" size="sm" className="mb-10">
            <Link href="/"><ArrowLeft className="size-4" /> Wróć</Link>
          </Button>
          <Badge>{eyebrow}</Badge>
          <h1 className="font-display mt-6 text-[clamp(4.2rem,13vw,10rem)] font-black uppercase leading-[0.79] tracking-[-0.055em]">{title}</h1>
          <div className="mt-8 grid max-w-3xl gap-5 border-l-2 border-orange-500 pl-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <p className="text-base leading-7 text-white/70 sm:text-lg">{description}</p>
            <p className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold"><MapPin className="size-4 text-orange-400" /> {location}</p>
          </div>
          <ArrowDownRight className="mt-10 size-9 text-orange-500" />
        </div>
      </div>
    </section>
  );
}
