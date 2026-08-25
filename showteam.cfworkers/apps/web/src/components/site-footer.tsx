import { ArrowUpRight, Facebook, Instagram, Music2 } from "lucide-react";
import Link from "next/link";

import { contact } from "@/lib/offers";

export function SiteFooter() {
	return (
		<footer className="relative overflow-hidden border-white/10 border-t bg-black py-12">
			<div className="site-container relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
				<div>
					<p className="font-black font-display text-4xl uppercase tracking-tight md:text-6xl">
						Love the things
						<br />
						<span className="text-orange-500">that make you happy.</span>
					</p>
					<p className="mt-5 max-w-lg text-sm text-white/45 leading-6">Wyjazdy, obozy i sporty wodne od Jeziora Łąckiego po Dolomity.</p>
				</div>
				<div className="grid gap-2 font-semibold text-sm md:text-right">
					<a href={`mailto:${contact.email}`} className="hover:text-orange-400">
						{contact.email}
					</a>
					<a href={contact.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-orange-400 md:justify-end">
						<Instagram className="size-4" /> Instagram <ArrowUpRight className="size-3" />
					</a>
					<a href={contact.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-orange-400 md:justify-end">
						<Facebook className="size-4" /> Facebook <ArrowUpRight className="size-3" />
					</a>
					<a href={contact.tiktok} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-orange-400 md:justify-end">
						<Music2 className="size-4" /> TikTok <ArrowUpRight className="size-3" />
					</a>
					<Link href="/zgloszenie" className="hover:text-orange-400">
						Jedź z nami
					</Link>
					<Link href="/zorganizuj-impreze" className="hover:text-orange-400">
						Zorganizuj imprezę
					</Link>
					<Link href="/noclegi" className="hover:text-orange-400">
						Noclegi nad wodą
					</Link>
					<Link href="/rezerwacje" className="hover:text-orange-400">
						Rezerwuj aktywność
					</Link>
					<Link href="/galeria" className="hover:text-orange-400">
						Galeria
					</Link>
					<Link href="/kontakt" className="hover:text-orange-400">
						Kontakt i o nas
					</Link>
				</div>
			</div>
			<div className="site-container relative mt-12 overflow-hidden border-white/10 border-y py-3">
				<p className="-rotate-1 text-right font-black font-mono text-2xl text-red-500 lowercase leading-none sm:text-4xl">no limits...</p>
			</div>
			<div className="site-container relative mt-5 flex flex-col gap-2 text-white/30 text-xs uppercase tracking-[0.16em] sm:flex-row sm:justify-between">
				<span>© 2026 SHOWteam</span>
				<span>Poręba · Śląsk · Polska</span>
			</div>
		</footer>
	);
}
