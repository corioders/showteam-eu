import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Facebook, Instagram, Mail, MapPin, Music2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contact } from "@/lib/offers";

export const metadata: Metadata = { title: "Kontakt", description: "Skontaktuj się z SHOWteam — Poręba, Jezioro Łąckie.", alternates: { canonical: "/kontakt" } };

export default function ContactPage() {
  return (
    <section className="min-h-screen bg-orange-500 pb-16 pt-32 text-neutral-950 md:pb-24 md:pt-40">
      <div className="site-container">
        <Button asChild variant="outline" size="sm" className="border-black/20 bg-black/5 text-black hover:bg-black/10">
          <Link href="/"><ArrowLeft className="size-4" /> Wróć</Link>
        </Button>
        <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Porozmawiajmy</span>
            <h1 className="font-display mt-5 text-[clamp(5rem,14vw,11rem)] font-black uppercase leading-[0.76] tracking-[-0.06em]">Say<br />hello!</h1>
            <p className="mt-10 max-w-xl border-l-2 border-black pl-5 text-lg leading-8 text-neutral-800">Najlepszy plan zaczyna się od krótkiej rozmowy. Powiedz, co chcesz robić — dobierzemy miejsce, termin i poziom aktywności.</p>
          </div>
          <div className="poster-cut overflow-hidden bg-neutral-950 text-white">
            <a href={contact.joanna.href} className="group flex items-center justify-between border-b border-white/10 p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40">{contact.joanna.name}</span><p className="mt-2 font-display text-3xl font-black">{contact.joanna.phone}</p></div><Phone className="size-6 text-orange-400" /></a>
            <a href={contact.adam.href} className="group flex items-center justify-between border-b border-white/10 p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40">{contact.adam.name}</span><p className="mt-2 font-display text-3xl font-black">{contact.adam.phone}</p></div><Phone className="size-6 text-orange-400" /></a>
            <a href={`mailto:${contact.email}`} className="flex items-center justify-between border-b border-white/10 p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40">E-mail</span><p className="mt-2 text-lg font-semibold">{contact.email}</p></div><Mail className="size-6 text-orange-400" /></a>
            <a href={contact.map} target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 transition hover:bg-white/5 sm:p-8"><div><span className="text-xs uppercase tracking-[0.16em] text-white/40">Wake & Surf Village</span><p className="mt-2 text-lg font-semibold">Poręba, ul. Nad Zaporą 21</p></div><MapPin className="size-6 text-orange-400" /></a>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800"><a href={contact.instagram} target="_blank" rel="noreferrer"><Instagram className="size-5" /> Instagram <ArrowUpRight className="size-4" /></a></Button>
          <Button asChild size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800"><a href={contact.tiktok} target="_blank" rel="noreferrer"><Music2 className="size-5" /> TikTok <ArrowUpRight className="size-4" /></a></Button>
          <Button asChild size="lg" className="border border-black/20 bg-transparent text-black hover:bg-black/10"><a href={contact.facebook} target="_blank" rel="noreferrer"><Facebook className="size-5" /> Facebook <ArrowUpRight className="size-4" /></a></Button>
        </div>
      </div>
    </section>
  );
}
