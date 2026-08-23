"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { href: "/", label: "Start" },
  { href: "/oferta/lato", label: "Lato" },
  { href: "/oferta/zima", label: "Zima" },
  { href: "/oferta/szkolenia", label: "Szkolenia" },
  { href: "/rezerwacje", label: "Aktywności" },
  { href: "/zorganizuj-impreze", label: "Zorganizuj imprezę" },
  { href: "/noclegi", label: "Noclegi" },
  { href: "/galeria", label: "Galeria" },
  { href: "/kontakt", label: "Kontakt i o nas" },
];
const applicationLink = { href: "/zgloszenie", label: "Jedź z nami" };

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-neutral-950/75 backdrop-blur-xl">
      <div className="site-container flex h-20 items-center justify-between">
        <Link href="/" prefetch className="inline-flex min-h-11 items-center bg-orange-500 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950" aria-label="SHOWteam — strona główna">
          <Image src="/media/showteam-logo.svg" alt="" width={1022} height={241} className="h-auto w-36 sm:w-40" priority />
        </Link>

        <nav className="hidden items-center gap-1 2xl:flex" aria-label="Główna nawigacja">
          {links.map((link) => (
            <Button asChild variant="ghost" size="sm" key={link.href} className={pathname === link.href ? "bg-white/10 text-orange-400" : undefined}>
              <Link href={link.href} prefetch aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="hidden min-[360px]:inline-flex"><Link href={applicationLink.href} prefetch>{applicationLink.label}</Link></Button>
          <Button asChild size="sm" className="hidden 2xl:inline-flex"><a href="tel:+48500128090"><Phone className="size-4" /> Zadzwoń</a></Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="2xl:hidden" aria-label="Otwórz menu">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:left-auto sm:w-[min(42rem,100vw)]">
            <div className="flex h-svh flex-col overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6">
              <div className="flex h-11 items-center border-b border-white/10 pb-4 pr-14">
                <span className="bg-orange-500 px-2 py-1">
                  <Image src="/media/showteam-logo.svg" alt="SHOWteam" width={1022} height={241} className="h-auto w-36" />
                </span>
              </div>
              <span className="eyebrow mb-4 mt-8">Idź do</span>
              <nav className="grid grid-cols-2 border-l border-t border-white/10" aria-label="Menu mobilne">
                {[...links, applicationLink].map((link, index) => (
                  <SheetClose asChild key={link.href}>
                    <Link href={link.href} prefetch aria-current={pathname === link.href ? "page" : undefined} className={`group flex min-h-20 flex-col justify-between border-b border-r border-white/10 p-3 font-display font-black uppercase transition-colors hover:bg-orange-500 hover:text-black focus-visible:bg-orange-500 focus-visible:text-black focus-visible:outline-none sm:min-h-24 ${pathname === link.href ? "bg-orange-500 text-black" : ""}`}>
                      <span className="font-mono text-[.6rem] tracking-wider text-white/30 group-hover:text-black/55 group-focus-visible:text-black/55">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-[1.35rem] leading-none tracking-[-.03em] sm:text-[1.65rem]">{link.label}</span>
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <Button asChild className="mt-6 min-h-12">
                <a href="tel:+48500128090"><Phone className="size-4" /> +48 500 128 090</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
