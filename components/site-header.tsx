"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { href: "/", label: "Start" },
  { href: "/oferta/lato", label: "Lato" },
  { href: "/oferta/zima", label: "Zima" },
  { href: "/oferta/szkolenia", label: "Szkolenia" },
  { href: "/wydarzenia", label: "Wydarzenia" },
  { href: "/aktualnosci", label: "Aktualności" },
  { href: "/rezerwacje", label: "Rezerwacje" },
  { href: "/galeria", label: "Galeria" },
  { href: "/kontakt", label: "Kontakt" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-neutral-950/75 backdrop-blur-xl">
      <div className="site-container flex h-20 items-center justify-between">
        <Link href="/" prefetch className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="SHOWteam — strona główna">
          <Image src="/media/monkey-logo.jpg" alt="" width={42} height={42} className="size-11 rounded-full border border-orange-400/40 object-cover" priority />
          <span className="font-display text-xl font-black uppercase tracking-tight">SHOW<span className="text-orange-500">team</span></span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Główna nawigacja">
          {links.map((link) => (
            <Button asChild variant="ghost" size="sm" key={link.href}>
              <Link href={link.href} prefetch>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm">
            <a href="tel:+48500128090"><Phone className="size-4" /> Zadzwoń</a>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Otwórz menu">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex min-h-svh flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
              <div className="flex h-11 items-center gap-3 border-b border-white/10 pb-4 pr-14">
                <Image src="/media/monkey-logo.jpg" alt="" width={34} height={34} className="size-9 rounded-full border border-orange-400/40 object-cover" />
                <span className="font-display text-lg font-black uppercase">SHOW<span className="text-orange-500">team</span></span>
              </div>
              <span className="eyebrow mb-4 mt-8">Idź do</span>
              <nav className="grid grid-cols-2 border-l border-t border-white/10" aria-label="Menu mobilne">
                {links.map((link, index) => (
                  <SheetClose asChild key={link.href}>
                    <Link href={link.href} prefetch className="group flex min-h-24 flex-col justify-between border-b border-r border-white/10 p-3 font-display font-black uppercase transition-colors hover:bg-orange-500 hover:text-black focus-visible:bg-orange-500 focus-visible:text-black focus-visible:outline-none">
                      <span className="font-mono text-[.6rem] tracking-wider text-white/30 group-hover:text-black/55 group-focus-visible:text-black/55">0{index + 1}</span>
                      <span className="text-[1.65rem] leading-none tracking-[-.03em]">{link.label}</span>
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <Button asChild className="mt-auto min-h-12">
                <a href="tel:+48500128090"><Phone className="size-4" /> +48 500 128 090</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
