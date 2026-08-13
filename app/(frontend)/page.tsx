import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Instagram, MapPin, Music2, Waves, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactCta } from "@/components/contact-cta";
import { OfferCard } from "@/components/offer-card";
import { getOffers } from "@/lib/cms";
import { getGallery } from "@/lib/gallery";
import { contact } from "@/lib/offers";
import { GalleryGrid } from "@/components/gallery-grid";
import { HeroVideo } from "@/components/hero-video";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [offers, gallery] = await Promise.all([getOffers(), getGallery(8)]);
  return (
    <>
      <section className="grain relative min-h-svh overflow-hidden pt-20">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
        <div className="site-container relative flex min-h-[calc(100svh-5rem)] flex-col justify-end pb-10 pt-20 md:pb-16">
          <div className="mb-20 flex flex-wrap items-center gap-3 md:mb-24">
            <Badge>Sezon 2026</Badge>
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/60"><MapPin className="size-4 text-sky-300" /> Poręba · Dolomity · Andorra</span>
          </div>
          <h1 className="font-display max-w-6xl text-[clamp(3.25rem,16vw,7rem)] font-black uppercase leading-[0.84] tracking-[-0.055em] md:text-[clamp(7rem,14vw,11.5rem)] md:leading-[0.82] md:tracking-[-0.065em]">
            Zrób<br /><span className="text-orange-500">sobie SHOW.</span>
          </h1>
          <div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,34rem)_auto] sm:items-end">
            <p className="max-w-xl border-l-2 border-orange-500 pl-5 text-base leading-7 text-white/75 md:text-lg">Sport, podróże i ludzie z energią. Od własnej plaży nad Jeziorem Łąckim po śnieg w Dolomitach.</p>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Button asChild size="lg"><Link href="#oferta">Poznaj ofertę <ArrowDown className="size-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="/kontakt">Kontakt</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-white/10 bg-sky-300 py-4 text-neutral-950">
        <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap font-display text-xl font-black uppercase tracking-tight">
          {[0, 1].map((copy) => (
            <div className="flex items-center gap-8" key={copy} aria-hidden={copy === 1}>
              <span>Wake</span><Waves className="size-5" /><span>Wind</span><Wind className="size-5" /><span>Snow</span><span className="text-orange-600">●</span><span>Camp</span><span>Padel</span><span className="text-orange-600">●</span><span>Adventure</span><span>FizjoSPORT</span><span className="text-orange-600">●</span>
            </div>
          ))}
        </div>
      </div>

      <section className="relative isolate overflow-hidden border-b border-red-950 bg-black py-10">
        <Image src="/media/legacy-light-trails-top.jpg" alt="" fill className="-z-10 object-contain object-center opacity-75 sm:object-cover" sizes="100vw" />
        <div className="site-container flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl">Just <span className="text-orange-500">4</span> fun</p>
          <p className="-rotate-2 font-mono text-2xl font-black lowercase text-red-500 sm:text-4xl">no limits...</p>
        </div>
      </section>

      <section id="oferta" className="py-20 md:py-32">
        <div className="site-container">
          <div className="mb-12 grid gap-6 md:grid-cols-[1fr_28rem] md:items-end">
            <div><span className="eyebrow">Wybierz swój kierunek</span><h2 className="font-display mt-4 text-6xl font-black uppercase leading-[0.87] tracking-[-0.045em] sm:text-8xl">Zrób sobie<br /><span className="text-sky-300">SHOW.</span></h2></div>
            <p className="text-base leading-7 text-white/55">Nie wybieramy między sportem i odpoczynkiem. Łączymy je w programach dla rodzin, dzieci, grup i dorosłych, którzy nadal chcą próbować nowych rzeczy.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            {offers.map((offer, index) => (
              <OfferCard
                key={offer.title}
                offer={offer}
                index={index}
                className={index === 0 ? "lg:col-span-7 lg:min-h-[42rem]" : index === 1 ? "lg:col-span-5 lg:mt-20 lg:min-h-[34rem]" : index === 3 ? "lg:col-span-7 lg:min-h-[34rem]" : "lg:col-span-5 lg:min-h-[34rem]"}
              />
            ))}
            <aside className="poster-cut relative flex min-h-[34rem] flex-col justify-between overflow-hidden bg-sky-300 p-7 text-neutral-950 sm:p-10 lg:col-span-7">
              <div className="absolute -right-8 -top-10 font-display text-[13rem] font-black leading-none text-black/[0.06]" aria-hidden="true">!</div>
              <div className="relative flex items-center justify-between border-b border-black/25 pb-4 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                <span>Plan na cały rok</span><span>03 / 03</span>
              </div>
              <p className="relative font-display max-w-2xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.04em] sm:text-7xl">Nie czekaj<br />na dobry<br /><span className="text-orange-600">moment.</span></p>
              <nav className="relative grid border-l border-t border-black/25 sm:grid-cols-3" aria-label="Skróty do oferty">
                {[{ href: "/oferta/lato", label: "Woda" }, { href: "/oferta/zima", label: "Śnieg" }, { href: "/oferta/szkolenia", label: "Szkolenia" }].map((item, index) => (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between border-b border-r border-black/25 p-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black">
                    <span>0{index + 1} {item.label}</span><ArrowUpRight className="size-4" />
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] py-20 md:py-32">
        <div className="site-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="poster-cut relative min-h-[32rem] overflow-hidden">
            <Image src="/media/summer-sailing-drone.jpg" alt="Katamaran SHOWteam na Jeziorze Łąckim" fill className="object-cover object-[40%_center]" sizes="(min-width:1024px) 42vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            <p className="absolute bottom-6 left-6 max-w-xs font-display text-3xl font-black uppercase leading-tight">Jedyny taki adres na Śląsku.</p>
          </div>
          <div>
            <span className="eyebrow">To nie jest katalog wycieczek</span>
            <h2 className="font-display mt-5 text-6xl font-black uppercase leading-[0.87] tracking-[-0.04em] sm:text-8xl">Robimy<br />rzeczy <span className="text-orange-500">razem.</span></h2>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/60">Joanna i Adam SHOWtysek od lat budują aktywną społeczność wokół sportu, dobrej energii i miejsc, do których chce się wracać. Profesjonalnie, osobiście i z charakterem.</p>
            <Button asChild variant="outline" className="mt-8"><Link href="/kontakt">Poznaj SHOWteam <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="gallery-container">
          <div className="mb-10 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div><span className="eyebrow">Prosto z akcji</span><h2 className="font-display mt-3 text-5xl font-black uppercase tracking-tight sm:text-7xl">#showteam.eu</h2></div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="icon"><a href={contact.instagram} target="_blank" rel="noreferrer" aria-label="Instagram SHOWteam"><Instagram className="size-5" /></a></Button>
              <Button asChild variant="outline" size="icon"><a href={contact.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok SHOWteam"><Music2 className="size-5" /></a></Button>
            </div>
          </div>
          <GalleryGrid photos={gallery.slice(0, 8)} />
          <div className="mt-7 flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/galeria">Otwórz całą galerię</Link></Button><Button asChild variant="ghost"><a href={contact.instagram} target="_blank" rel="noreferrer">Instagram</a></Button><Button asChild variant="ghost"><a href={contact.tiktok} target="_blank" rel="noreferrer">TikTok</a></Button></div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}
