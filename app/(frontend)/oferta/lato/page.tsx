import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bike, Sailboat, TentTree, Waves } from "lucide-react";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { LocationLinks } from "@/components/location-links";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getOffer } from "@/lib/cms";
import { contact } from "@/lib/offers";

export const metadata: Metadata = { title: "SHOWlato 2026", description: "Wake & Surf Village, SHOWCamp i sporty wodne nad Jeziorem Łąckim.", alternates: { canonical: "/oferta/lato" } };
export const revalidate = false;

const activities = [
  [Waves, "Na wodzie", "Wakeboard, narty wodne, SUP, kajaki, windsurfing, wing foil i skutery wodne."],
  [Sailboat, "Pod żaglami", "Katamarany Hobie Cat, łodzie żaglowe i kursy prowadzone przez instruktorów."],
  [Bike, "Na lądzie", "Padel, rowery elektryczne, siatkówka plażowa, badminton, slackline i frisbee."],
  [TentTree, "Po wszystkim", "Glamping, prywatne molo, piaszczysta plaża, hamaki, sauna i wieczorne kino."],
] as const;

export default async function SummerPage() {
  const offer = await getOffer("lato");
  if (!offer) notFound();
  return (
    <>
      <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} offer={offer} />
      <LocationLinks locations={[{ label: "Wake & Surf Village · Nad Zaporą 21, Poręba", href: contact.map }]} />

      <section className="py-20 md:py-28">
        <div className="site-container">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div><span className="eyebrow">SHOWCamp 2026</span><h2 className="font-display mt-4 text-6xl font-black uppercase leading-[0.88] tracking-tight sm:text-8xl">Pięć turnusów.<br /><span className="text-sky-300">Jedno lato.</span></h2><p className="mt-6 max-w-lg leading-7 text-white/55">Wybierz termin i zapytaj nas o wolne miejsce.</p></div>
            <div className="poster-cut overflow-hidden border border-white/10">
              {offer.dates.map((date, index) => (
                <div key={`${date}-${index}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-white/10 px-5 py-6 last:border-0 sm:grid-cols-[4rem_1fr_auto] sm:px-8">
                  <span className="font-display text-3xl font-black text-orange-500">0{index + 1}</span><span className="font-semibold">Turnus {index + 1}</span><span className="text-right text-sm text-white/50">{date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] py-20 md:py-28">
        <div className="site-container">
          <span className="eyebrow">Z brzegu prosto do akcji</span><h2 className="font-display mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">Wybierz sprzęt.<br />Resztę pokażemy.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {activities.map(([Icon, title, text]) => (
              <div key={title} className="border border-white/15 bg-black/20 p-7 sm:p-9"><Icon className="size-8 text-orange-400" /><h3 className="font-display mt-12 text-3xl font-black uppercase">{title}</h3><p className="mt-3 leading-7 text-white/55">{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28"><div className="site-container grid gap-10 lg:grid-cols-2"><div><span className="eyebrow">Dobra baza to połowa przygody</span><h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Co czeka<br />na miejscu?</h2></div><Accordion type="single" collapsible className="w-full"><AccordionItem value="sprzet"><AccordionTrigger>Sprzęt i instruktorzy</AccordionTrigger><AccordionContent>Wakeboard, windsurfing, katamarany, SUP-y, kajaki, łodzie żaglowe, narty wodne i sprzęt motorowodny. Zajęcia dopasowujemy do poziomu uczestników.</AccordionContent></AccordionItem><AccordionItem value="baza"><AccordionTrigger>Wake & Surf Village</AccordionTrigger><AccordionContent>Prywatne molo, piaszczysta plaża, strefa chill, miejsce grillowe i ogniskowe, sauna, boisko, parking oraz zaplecze sanitarne.</AccordionContent></AccordionItem><AccordionItem value="jedzenie"><AccordionTrigger>Surf Bistro i eventy</AccordionTrigger><AccordionContent>Menu cateringowe na zamówienie, włoska pizza z pieca opalanego drewnem oraz przestrzeń na imprezy rodzinne i firmowe.</AccordionContent></AccordionItem><AccordionItem value="lokalizacja"><AccordionTrigger>Dojazd</AccordionTrigger><AccordionContent>Poręba, ul. Nad Zaporą 21 — nad Jeziorem Łąckim, kilka minut od Pszczyny.</AccordionContent></AccordionItem></Accordion></div></section>
      <PhotoMosaic label="SHOWlato bez filtra" photos={[{ src: "/media/summer-wake-hero.jpg", alt: "Wakeboard na Jeziorze Łąckim z lotu ptaka", position: "object-[60%_center]" }, { src: "/media/summer-sailing-drone.jpg", alt: "Katamaran SHOWteam na Jeziorze Łąckim", position: "object-[35%_center]" }, { src: "/media/summer-double-wake.jpg", alt: "Dwie osoby na wakeboardzie za łodzią SHOWteam" }]} />
      <CmsDetails offer={offer} />
      <ContactCta title="Wskakujesz do wody?" applicationOffer={offer.title} />
    </>
  );
}
