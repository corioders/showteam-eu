import Link from "next/link";
import { ArrowUpRight, Instagram, Music2 } from "lucide-react";
import { contact } from "@/lib/offers";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black py-12">
      <div className="site-container relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-display text-4xl font-black uppercase tracking-tight md:text-6xl">Love the things<br /><span className="text-orange-500">that make you happy.</span></p>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/45">Aktywne wyjazdy, sport i emocje od Śląska po Dolomity. Projektujemy czas, który zostaje w pamięci.</p>
        </div>
        <div className="grid gap-2 text-sm font-semibold md:text-right">
          <a href={`mailto:${contact.email}`} className="hover:text-orange-400">{contact.email}</a>
          <a href={contact.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-orange-400 md:justify-end"><Instagram className="size-4" /> Instagram <ArrowUpRight className="size-3" /></a>
          <a href={contact.tiktok} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-orange-400 md:justify-end"><Music2 className="size-4" /> TikTok <ArrowUpRight className="size-3" /></a>
          <Link href="/wydarzenia" className="hover:text-orange-400">Wydarzenia</Link>
          <Link href="/rezerwacje" className="hover:text-orange-400">Rezerwacje</Link>
          <Link href="/galeria" className="hover:text-orange-400">Galeria</Link>
          <Link href="/kontakt" className="hover:text-orange-400">Kontakt</Link>
        </div>
      </div>
      <div className="site-container relative mt-12 overflow-hidden border-y border-white/10 py-3">
        <p className="-rotate-1 text-right font-mono text-2xl font-black lowercase leading-none text-red-500 sm:text-4xl">no limits...</p>
      </div>
      <div className="site-container relative mt-5 flex flex-col gap-2 text-xs uppercase tracking-[0.16em] text-white/30 sm:flex-row sm:justify-between">
        <span>© 2026 SHOWteam</span><span>Poręba · Śląsk · Polska</span>
      </div>
    </footer>
  );
}
