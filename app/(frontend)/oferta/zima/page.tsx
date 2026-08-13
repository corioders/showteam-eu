import type { Metadata } from "next";
import { Footprints, MountainSnow, PartyPopper, Snowflake, UtensilsCrossed } from "lucide-react";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { getOffer } from "@/lib/cms";

export const metadata: Metadata = { title: "SHOWzima 2026", description: "Trentino, Andorra, szkolenie narciarskie i aktywny après-ski." };
export const dynamic = "force-dynamic";

export default async function WinterPage() {
  const offer = await getOffer("zima");
  return (
    <>
      <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} />
      <section className="py-20 md:py-28"><div className="site-container grid gap-12 lg:grid-cols-[0.85fr_1.15fr]"><div><Badge>Trentino 2026</Badge><h2 className="font-display mt-5 text-6xl font-black uppercase leading-[0.86] tracking-tight sm:text-8xl">Dziesięć<br /><span className="text-sky-300">tygodni.</span></h2><p className="mt-6 max-w-lg leading-7 text-white/55">Terminy z opublikowanego programu zimowego 2025/26. Skontaktuj się z nami, aby potwierdzić dostępność.</p></div><div className="grid border-l border-t border-white/15 sm:grid-cols-2">{offer.dates.map((date, index) => <div key={`${date}-${index}`} className="flex min-h-24 items-center gap-4 border-b border-r border-white/15 p-5"><span className="font-display text-3xl font-black text-orange-500">{String(index + 1).padStart(2, "0")}</span><span className="text-sm font-semibold">{date}</span></div>)}</div></div></section>
      <section className="border-y border-white/10 bg-sky-300 py-20 text-neutral-950 md:py-28"><div className="site-container"><span className="text-xs font-bold uppercase tracking-[0.2em]">W pakiecie jest więcej niż stok</span><h2 className="font-display mt-4 max-w-5xl text-6xl font-black uppercase leading-[0.86] tracking-tight sm:text-8xl">Jazda. Jedzenie.<br />Ludzie. Widoki.</h2><div className="mt-12 grid gap-px overflow-hidden bg-neutral-950/15 sm:grid-cols-2 lg:grid-cols-4">{[[Snowflake,"Szkolenie","Dzieci, młodzież i dorośli — od podstaw po technikę sportową."],[MountainSnow,"Trasy","Hotel na stoku, przygotowane trasy i freeride dla chętnych."],[UtensilsCrossed,"Italia","Regionalna kuchnia, lokalne smaki i prawdziwa włoska atmosfera."],[PartyPopper,"Après-ski","Garda, trekking, pochodnie, integracja i SHOWniespodzianki."]].map(([Icon,title,text]) => { const I = Icon as typeof Snowflake; return <div key={title as string} className="bg-sky-300 p-7"><I className="size-8" /><h3 className="font-display mt-12 text-3xl font-black uppercase">{title as string}</h3><p className="mt-3 text-sm leading-6 text-neutral-800">{text as string}</p></div>; })}</div></div></section>
      <section className="py-20 md:py-28"><div className="site-container grid gap-10 lg:grid-cols-2"><div><Badge>Andorra 2026</Badge><h2 className="font-display mt-5 text-6xl font-black uppercase leading-[0.86] tracking-tight sm:text-8xl">Pireneje<br /><span className="text-orange-500">+ Barcelona.</span></h2><div className="mt-8 flex items-center gap-4"><div className="grid size-14 place-items-center rounded-full bg-white/10"><Footprints className="size-6 text-orange-400" /></div><div><p className="font-semibold">15–22 marca 2026</p><p className="text-sm text-white/45">Termin opublikowanego wyjazdu</p></div></div></div><Accordion type="single" collapsible><AccordionItem value="ski"><AccordionTrigger>5 dni na nartach</AccordionTrigger><AccordionContent>Grandvalira oferuje rozległe trasy, freeride i jazdę terenową na wysokości 1710–2640 m n.p.m.</AccordionContent></AccordionItem><AccordionItem value="after"><AccordionTrigger>Po nartach</AccordionTrigger><AccordionContent>Ferraty, psie zaprzęgi, Caldea SPA, Andorra la Vella i wieczorne spotkania z grupą.</AccordionContent></AccordionItem><AccordionItem value="barcelona"><AccordionTrigger>2 dni w Barcelonie</AccordionTrigger><AccordionContent>Bike tour, La Rambla, Sagrada Família, Park Güell oraz lokalne atrakcje wybierane z uczestnikami.</AccordionContent></AccordionItem></Accordion></div></section>
      <PhotoMosaic label="SHOWzima bez filtra" photos={[{ src: "/media/showteam-trentino-collage.jpg", alt: "SHOWteam na zimowym wyjeździe w Trentino", fit: "contain" }, { src: "/media/showteam-andorra-collage.jpg", alt: "Rodzinna SHOWzima w Andorze", fit: "contain" }, { src: "/media/showteam-winter-fire.jpg", alt: "Wieczór z pochodniami na śniegu", fit: "contain" }]} />
      <CmsDetails offer={offer} />
      <ContactCta title="Jedziesz z nami?" />
    </>
  );
}
