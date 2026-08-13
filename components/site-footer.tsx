import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";
import { contact } from "@/lib/offers";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black py-12">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[url('/media/legacy-light-trails-bottom.jpg')] bg-cover bg-center opacity-30" />
      <div className="site-container relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-display text-4xl font-black uppercase tracking-tight md:text-6xl">Love the things<br /><span className="text-orange-500">that make you happy.</span></p>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/45">Aktywne wyjazdy, sport i emocje od Śląska po Dolomity. Projektujemy czas, który zostaje w pamięci.</p>
        </div>
        <div className="grid gap-2 text-sm font-semibold md:text-right">
          <a href={`mailto:${contact.email}`} className="hover:text-orange-400">{contact.email}</a>
          <a href={contact.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-orange-400 md:justify-end"><Instagram className="size-4" /> Instagram <ArrowUpRight className="size-3" /></a>
          <Link href="/galeria" className="hover:text-orange-400">Galeria</Link>
          <Link href="/kontakt" className="hover:text-orange-400">Kontakt</Link>
        </div>
      </div>
      <div className="site-container relative mt-12 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.16em] text-white/30 sm:flex-row sm:justify-between">
        <span>© 2026 SHOWteam</span><span>Poręba · Śląsk · Polska</span>
      </div>
    </footer>
  );
}
