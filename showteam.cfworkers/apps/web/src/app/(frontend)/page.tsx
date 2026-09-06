// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { ArrowDown, ArrowRight, ArrowUpRight, Facebook, Instagram, MapPin, Music2, Plane, Waves, Wind } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContactCta } from "@/components/contact-cta";
import { Editable } from "@/components/editor/editable";
import { EditableImage, PageContentEditor } from "@/components/editor/page-content-editor";
import { GalleryGrid } from "@/components/gallery-grid";
import { HeroVideo } from "@/components/hero-video";
import { OfferCard } from "@/components/offer-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOffers } from "@/lib/cms";
import { getGallery } from "@/lib/gallery";
import { contact } from "@/lib/offers";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
	return (
		<Suspense fallback={null}>
			<HomeContent />
		</Suspense>
	);
}

async function HomeContent() {
	const [offers, gallery, pageContent] = await Promise.all([getOffers(), getGallery(8), getPageContent("home")]);
	const content = pageContent.values;
	return (
		<PageContentEditor page="home" initial={content} initialMedia={pageContent.media}>
			<section className="grain relative min-h-svh overflow-hidden pt-20">
				<HeroVideo src={content.heroVideoUrl} poster={content.heroPosterUrl} />
				<div className="absolute inset-0 bg-gradient-to-r from-black via-black/45 to-transparent" />
				<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
				<div className="site-container relative flex min-h-[calc(100svh-5rem)] flex-col justify-end pt-20 pb-10 md:pb-16">
					<div className="mb-20 flex flex-wrap items-center gap-3 md:mb-24">
						<Badge render={<Editable field="heroBadge" />} />
						<nav
							className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-white/60 text-xs uppercase tracking-[0.15em]"
							aria-label="Lokalizacje SHOWteam"
						>
							<MapPin className="size-4 text-sky-300" aria-hidden="true" />
							{[
								["locationPorebaLabel", content.locationPorebaUrl],
								["locationDolomityLabel", content.locationDolomityUrl],
								["locationAndorraLabel", content.locationAndorraUrl],
							].map(([label, href], index) => (
								<span className="contents" key={label}>
									{index ? <span aria-hidden="true">·</span> : null}
									<Editable
										field={label}
										render={
											<a
												href={href}
												target="_blank"
												rel="noreferrer"
												className="border-transparent border-b py-1 transition hover:border-sky-300 hover:text-white focus-visible:border-sky-300 focus-visible:text-white focus-visible:outline-none"
											/>
										}
									/>
								</span>
							))}
						</nav>
					</div>
					<h1 className="max-w-6xl font-black font-display text-[clamp(3.25rem,16vw,7rem)] uppercase leading-[0.84] tracking-[-0.055em] md:text-[clamp(7rem,14vw,11.5rem)] md:leading-[0.82] md:tracking-[-0.065em]">
						<Editable field="heroTitleTop" />
						<br />
						<Editable field="heroTitleAccent" render={<span className="text-orange-500" />} />
					</h1>
					<div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,34rem)_auto] sm:items-end">
						<Editable field="heroDescription" render={<p className="max-w-xl border-orange-500 border-l-2 pl-5 text-base text-white/75 leading-7 md:text-lg" />} />
						<div className="flex flex-wrap gap-3 sm:justify-end">
							<Button asChild={true} size="lg">
								<Link href="#oferta">
									<Editable field="heroPrimaryCta" /> <ArrowDown className="size-4" />
								</Link>
							</Button>
							<Button asChild={true} variant="outline" size="lg">
								<Link href="/kontakt">
									<Editable field="heroSecondaryCta" />
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			<div className="overflow-hidden border-white/10 border-y bg-sky-300 py-4 text-neutral-950">
				<div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap font-black font-display text-xl uppercase tracking-tight">
					{[0, 1].map((copy) => (
						<div className="flex items-center gap-8" key={copy} aria-hidden={copy === 1}>
							<Editable field="ticker" />
							<Waves className="size-5" />
							<Wind className="size-5" />
							<span className="text-orange-600">●</span>
						</div>
					))}
				</div>
			</div>

			<section className="relative isolate overflow-hidden border-red-950 border-b bg-black py-10">
				<EditableImage field="legacyImageUrl" alt="" className="-z-10 object-contain object-center opacity-75 sm:object-cover" sizes="100vw" />
				<div className="site-container flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<Editable field="legacyTagline" render={<p className="font-black font-display text-5xl uppercase leading-none tracking-tight sm:text-7xl" />} />
					<Editable field="legacyNoLimits" render={<p className="-rotate-2 font-black font-mono text-2xl text-red-500 lowercase sm:text-4xl" />} />
				</div>
			</section>

			<section id="oferta" className="py-20 md:py-32">
				<div className="site-container">
					<div className="mb-12 grid gap-6 md:grid-cols-[1fr_28rem] md:items-end">
						<div>
							<Editable field="offersEyebrow" render={<span className="eyebrow" />} />
							<h2 className="mt-4 font-black font-display text-6xl uppercase leading-[0.87] tracking-[-0.045em] sm:text-8xl">
								<Editable field="offersTitleTop" />
								<br />
								<Editable field="offersTitleAccent" render={<span className="text-sky-300" />} />
							</h2>
						</div>
						<Editable field="offersDescription" render={<p className="text-base text-white/55 leading-7" />} />
					</div>
					<div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
						{offers.map((offer, index) => (
							<OfferCard
								key={offer.title}
								offer={offer}
								index={index}
								className={
									index === 0
										? "lg:col-span-7 lg:min-h-[42rem]"
										: index === 1
											? "lg:col-span-5 lg:mt-20 lg:min-h-[34rem]"
											: index === 3
												? "lg:col-span-7 lg:min-h-[34rem]"
												: "lg:col-span-5 lg:min-h-[34rem]"
								}
							/>
						))}
						<aside className="poster-cut relative flex min-h-[34rem] flex-col justify-between overflow-hidden bg-sky-300 p-7 text-neutral-950 sm:p-10 lg:col-span-12">
							<div className="absolute -top-10 -right-8 font-black font-display text-[13rem] text-black/[0.06] leading-none" aria-hidden="true">
								!
							</div>
							<div className="relative flex items-center justify-between border-black/25 border-b pb-4 font-bold font-mono text-[0.68rem] uppercase tracking-[0.18em]">
								<Editable field="planEyebrow" />
								<span>04 / 04</span>
							</div>
							<Editable
								field="planTitle"
								render={<p className="relative max-w-2xl font-black font-display text-5xl uppercase leading-[0.88] tracking-[-0.04em] sm:text-7xl" />}
							/>
							<nav className="relative grid border-black/25 border-t border-l sm:grid-cols-4" aria-label="Skróty do oferty">
								{[
									{ href: "/oferta/lato", label: "Woda" },
									{ href: "/oferta/zima", label: "Śnieg" },
									{ href: "/oferta/szkolenia", label: "Szkolenia" },
									{ href: "/noclegi", label: "Noclegi" },
								].map((item, index) => (
									<Link
										key={item.href}
										href={item.href}
										className="flex items-center justify-between border-black/25 border-r border-b p-4 font-bold font-mono text-xs uppercase tracking-wider transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
									>
										<span>
											0{index + 1} {item.label}
										</span>
										<ArrowUpRight className="size-4" />
									</Link>
								))}
							</nav>
						</aside>
					</div>
				</div>
			</section>

			<section className="border-white/10 border-y bg-white/[0.03] py-20 md:py-32">
				<div className="site-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
					<div className="poster-cut relative min-h-[32rem] overflow-hidden">
						<EditableImage
							field="aboutImageUrl"
							alt="Katamaran SHOWteam na Jeziorze Łąckim"
							className="object-cover object-[40%_center]"
							sizes="(min-width:1024px) 42vw, 100vw"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
						<Editable field="aboutImageCaption" render={<p className="absolute bottom-6 left-6 max-w-xs font-black font-display text-3xl uppercase leading-tight" />} />
					</div>
					<div>
						<Editable field="aboutEyebrow" render={<span className="eyebrow" />} />
						<Editable
							field="aboutTitle"
							render={<h2 aria-label={content.aboutTitle} className="mt-5 font-black font-display text-6xl uppercase leading-[0.87] tracking-[-0.04em] sm:text-8xl" />}
						/>
						<Editable field="aboutBody" render={<p className="mt-8 max-w-2xl text-lg text-white/60 leading-8" />} />
						<Button asChild={true} variant="outline" className="mt-8">
							<Link href="/kontakt">
								<Editable field="aboutCta" /> <ArrowRight className="size-4" />
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<section className="border-white/10 border-b py-20 md:py-32">
				<div className="site-container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
					<div>
						<Editable field="partnersEyebrow" render={<span className="eyebrow" />} />
						<Editable
							field="partnersTitle"
							render={<h2 aria-label={content.partnersTitle} className="mt-4 font-black font-display text-6xl uppercase leading-[.87] tracking-tight sm:text-8xl" />}
						/>
						<Editable field="partnersBody" render={<p className="mt-7 max-w-xl text-white/55 leading-7" />} />
					</div>
					<article className="poster-cut flex min-h-80 flex-col justify-between bg-sky-300 p-7 text-black sm:p-10">
						<Plane className="size-10" />
						<div>
							<Editable field="droneTitle" render={<h3 aria-label={content.droneTitle} className="font-black font-display text-4xl uppercase sm:text-6xl" />} />
							<Editable field="droneBody" render={<p className="mt-5 max-w-2xl text-black/65 leading-7" />} />
							<Button asChild={true} className="mt-7 bg-black text-white hover:bg-black/80">
								<a href="mailto:biuro@showteam.eu?subject=Filmowanie%20dronem">
									<Editable field="droneCta" /> <ArrowUpRight className="size-4" />
								</a>
							</Button>
						</div>
					</article>
				</div>
			</section>

			<section className="py-20 md:py-32">
				<div className="gallery-container">
					<div className="mb-10 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<Editable field="galleryEyebrow" render={<span className="eyebrow" />} />
							<Editable
								field="galleryTitle"
								render={<h2 aria-label={content.galleryTitle} className="mt-3 font-black font-display text-5xl uppercase tracking-tight sm:text-7xl" />}
							/>
						</div>
						<div className="flex gap-2">
							<Button asChild={true} variant="outline" size="icon">
								<a href={contact.instagram} target="_blank" rel="noreferrer" aria-label="Instagram SHOWteam">
									<Instagram className="size-5" />
								</a>
							</Button>
							<Button asChild={true} variant="outline" size="icon">
								<a href={contact.facebook} target="_blank" rel="noreferrer" aria-label="Facebook SHOWteam">
									<Facebook className="size-5" />
								</a>
							</Button>
							<Button asChild={true} variant="outline" size="icon">
								<a href={contact.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok SHOWteam">
									<Music2 className="size-5" />
								</a>
							</Button>
						</div>
					</div>
					<GalleryGrid key={`${gallery[0]?.id ?? "empty"}-${gallery.length}`} photos={gallery.slice(0, 8)} />
					<div className="mt-7 flex flex-wrap gap-3">
						<Button asChild={true} variant="outline">
							<Link href="/galeria">
								<Editable field="galleryCta" />
							</Link>
						</Button>
						<Button asChild={true} variant="ghost">
							<a href={contact.instagram} target="_blank" rel="noreferrer">
								Instagram
							</a>
						</Button>
						<Button asChild={true} variant="ghost">
							<a href={contact.facebook} target="_blank" rel="noreferrer">
								Facebook
							</a>
						</Button>
						<Button asChild={true} variant="ghost">
							<a href={contact.tiktok} target="_blank" rel="noreferrer">
								TikTok
							</a>
						</Button>
					</div>
				</div>
			</section>

			<ContactCta title={<Editable field="finalCtaTitle" />} />
		</PageContentEditor>
	);
}
