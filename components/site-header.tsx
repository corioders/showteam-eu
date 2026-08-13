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
  { href: "/rezerwacje", label: "Rezerwacje" },
  { href: "/galeria", label: "Galeria" },
  { href: "/kontakt", label: "Kontakt" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-neutral-950/75 backdrop-blur-xl">
      <div className="site-container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="SHOWteam — strona główna">
          <Image src="/media/monkey-logo.jpg" alt="" width={42} height={42} className="size-11 rounded-full border border-orange-400/40 object-cover" priority />
          <span className="font-display text-xl font-black uppercase tracking-tight">SHOW<span className="text-orange-500">team</span></span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Główna nawigacja">
          {links.map((link) => (
            <Button asChild variant="ghost" size="sm" key={link.href}>
              <Link href={link.href}>{link.label}</Link>
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
            <div className="mt-16 flex flex-col">
              <span className="eyebrow mb-6">Idź do</span>
              {links.map((link, index) => (
                <SheetClose asChild key={link.href}>
                  <Link href={link.href} className="border-b border-white/10 py-5 font-display text-3xl font-black uppercase hover:text-orange-400">
                    <span className="mr-3 text-xs text-white/30">0{index + 1}</span>{link.label}
                  </Link>
                </SheetClose>
              ))}
              <Button asChild className="mt-8">
                <a href="tel:+48500128090"><Phone className="size-4" /> +48 500 128 090</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
