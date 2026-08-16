import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Facebook, Instagram, Mail, MapPin, Music2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableText, EditableUrl, PageContentEditor } from "@/components/editor/page-content-editor";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = { title: "Kontakt i o nas", description: "Poznaj SHOWteam i skontaktuj się z Asią lub Adamem — Poręba, Jezioro Łąckie.", alternates: { canonical: "/kontakt" } };

export default async function ContactPage() {
  const pageContent = await getPageContent("contact");
  const content = pageContent.values;
  const phoneLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
  return (
    <PageContentEditor page="contact" initial={content}>
    <section className="min-h-screen bg-orange-500 pb-16 pt-32 text-neutral-950 md:pb-24 md:pt-40">
      <div className="site-container">
        <Button asChild variant="outline" size="sm" className="border-black/20 bg-black/5 text-black hover:bg-black/10">
          <Link href="/"><ArrowLeft className="size-4" /> Wróć</Link>
        </Button>
        <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em]"><EditableText field="eyebrow" /></span>
            <h1 className="font-display mt-5 whitespace-pre-line text-[clamp(5rem,14vw,11rem)] font-black uppercase leading-[0.76] tracking-[-0.06em]"><EditableText field="title" multiline /></h1>
            <p className="mt-10 max-w-xl border-l-2 border-black pl-5 text-lg leading-8 text-neutral-800"><EditableText field="intro" multiline /></p>
          </div>
          <div className="poster-cut overflow-hidden bg-neutral-950 text-white">
            <a href={phoneLink(content.joannaPhone)} className="group flex items-center justify-between border-b border-white/10 p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40"><EditableText field="joannaName" /></span><p className="mt-2 font-display text-3xl font-black"><EditableText field="joannaPhone" /></p></div><Phone className="size-6 text-orange-400" /></a>
            <a href={phoneLink(content.adamPhone)} className="group flex items-center justify-between border-b border-white/10 p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40"><EditableText field="adamName" /></span><p className="mt-2 font-display text-3xl font-black"><EditableText field="adamPhone" /></p></div><Phone className="size-6 text-orange-400" /></a>
            <a href={`mailto:${content.email}`} className="flex items-center justify-between border-b border-white/10 p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40">E-mail</span><p className="mt-2 text-lg font-semibold"><EditableText field="email" /></p></div><Mail className="size-6 text-orange-400" /></a>
            <a href={content.mapUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40"><EditableText field="locationName" /></span><p className="mt-2 text-lg font-semibold"><EditableText field="address" /></p></div><MapPin className="size-6 text-orange-400" /></a>
            <div className="p-3"><EditableUrl field="mapUrl" label="Link do mapy" /></div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800"><a href={content.instagramUrl} target="_blank" rel="noreferrer"><Instagram className="size-5" /> Instagram <ArrowUpRight className="size-4" /></a></Button>
          <Button asChild size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800"><a href={content.tiktokUrl} target="_blank" rel="noreferrer"><Music2 className="size-5" /> TikTok <ArrowUpRight className="size-4" /></a></Button>
          <Button asChild size="lg" className="border border-black/20 bg-transparent text-black hover:bg-black/10"><a href={content.facebookUrl} target="_blank" rel="noreferrer"><Facebook className="size-5" /> Facebook <ArrowUpRight className="size-4" /></a></Button>
          <div className="grid w-full gap-2 sm:grid-cols-3"><EditableUrl field="instagramUrl" label="Link do Instagrama" /><EditableUrl field="tiktokUrl" label="Link do TikToka" /><EditableUrl field="facebookUrl" label="Link do Facebooka" /></div>
        </div>
        <section className="mt-16 border-y border-black/20 py-12 md:mt-24 md:py-16" aria-labelledby="o-nas">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
            <div><span className="text-xs font-bold uppercase tracking-[0.2em]"><EditableText field="aboutEyebrow" /></span><h2 id="o-nas" className="font-display mt-4 text-5xl font-black uppercase leading-[.9] sm:text-7xl"><EditableText field="aboutTitle" multiline /></h2></div>
            <div className="max-w-3xl space-y-5 text-lg leading-8 text-neutral-800">
              <p><EditableText field="aboutBody1" multiline /></p>
              <p><EditableText field="aboutBody2" multiline /></p>
            </div>
          </div>
        </section>
      </div>
    </section>
    </PageContentEditor>
  );
}
