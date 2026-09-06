"use client";

import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import { Menu, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import logo from "@/app/_assets/showteam-logo.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
	const [menuOpen, setMenuOpen] = useState(false);
	return (
		<header className="site-header fixed inset-x-0 top-0 z-40 border-white/10 border-b bg-neutral-950/75 backdrop-blur-xl">
			<div className="site-container flex h-20 items-center justify-between">
				<Link
					href="/"
					className="inline-flex min-h-11 items-center bg-orange-500 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
					aria-label="SHOWteam — strona główna"
				>
					<StaticImage src={logo} alt="" loading="eager" sizes="160px" className="h-auto w-36 sm:w-40" />
				</Link>

				<nav className="hidden items-center gap-1 2xl:flex" aria-label="Główna nawigacja">
					{links.map((link) => (
						<Button asChild={true} variant="ghost" size="sm" key={link.href} className={pathname === link.href ? "bg-white/10 text-orange-400" : undefined}>
							<Link href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
								{link.label}
							</Link>
						</Button>
					))}
				</nav>

				<div className="ml-auto flex items-center gap-2">
					<Button asChild={true} size="sm" className="hidden min-h-11 min-[360px]:inline-flex">
						<Link href={applicationLink.href}>{applicationLink.label}</Link>
					</Button>
					<Button asChild={true} size="sm" className="hidden 2xl:inline-flex">
						<a href="tel:+48500128090">
							<Phone className="size-4" /> Zadzwoń
						</a>
					</Button>
				</div>

				<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
					<SheetTrigger render={<Button variant="ghost" size="icon" className="2xl:hidden" aria-label="Otwórz menu" />}>
						<Menu />
					</SheetTrigger>
					<SheetContent className="sm:left-auto sm:w-[min(42rem,100vw)]">
						<div className="flex h-svh flex-col overflow-y-auto px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
							<div className="flex h-11 items-center border-white/10 border-b pr-14 pb-4">
								<span className="bg-orange-500 px-2 py-1">
									<StaticImage src={logo} alt="SHOWteam" loading="lazy" sizes="144px" className="h-auto w-36" />
								</span>
							</div>
							<span className="eyebrow mt-8 mb-4">Idź do</span>
							<nav className="grid grid-cols-2 border-white/10 border-t border-l" aria-label="Menu mobilne">
								{[...links, applicationLink].map((link, index) => (
									<Link
										key={link.href}
										href={link.href}
										aria-current={pathname === link.href ? "page" : undefined}
										onClick={() => setMenuOpen(false)}
										className={`group flex min-h-20 flex-col justify-between border-white/10 border-r border-b p-3 font-black font-display uppercase transition-colors hover:bg-orange-500 hover:text-black focus-visible:bg-orange-500 focus-visible:text-black focus-visible:outline-none sm:min-h-24 ${pathname === link.href ? "bg-orange-500 text-black" : ""}`}
									>
										<span className="font-mono text-[.6rem] text-white/30 tracking-wider group-hover:text-black/55 group-focus-visible:text-black/55">
											{String(index + 1).padStart(2, "0")}
										</span>
										<span className="text-[1.35rem] leading-none tracking-[-.03em] sm:text-[1.65rem]">{link.label}</span>
									</Link>
								))}
							</nav>
							<Button asChild={true} className="mt-6 min-h-12">
								<a href="tel:+48500128090">
									<Phone className="size-4" /> +48 500 128 090
								</a>
							</Button>
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</header>
	);
}
