import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bike, Sailboat, TentTree, Waves } from "lucide-react";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { OfferCtaTitle, OfferDateList, OfferInlineEditor, OfferLocationLink, OfferText } from "@/components/editor/offer-inline-editor";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getOfferByCategory } from "@/lib/cms";

export const metadata: Metadata = { title: "SHOWlato 2026", description: "Wake & Surf Village, SHOWCamp i sporty wodne nad Jeziorem Łąckim.", alternates: { canonical: "/oferta/lato" } };
export const revalidate = false;

const activities = [
  [Waves, "summerWaterTitle", "Na wodzie", "summerWaterBody", "Wakeboard, narty wodne, SUP, kajaki, windsurfing, wing foil i skutery wodne."],
  [Sailboat, "summerSailingTitle", "Pod żaglami", "summerSailingBody", "Katamarany Hobie Cat, łodzie żaglowe i kursy prowadzone przez instruktorów."],
  [Bike, "summerLandTitle", "Na lądzie", "summerLandBody", "Padel, rowery elektryczne, siatkówka plażowa, badminton, slackline i frisbee."],
  [TentTree, "summerAfterTitle", "Po wszystkim", "summerAfterBody", "Glamping, prywatne molo, piaszczysta plaża, hamaki, sauna i wieczorne kino."],
] as const;

export default async function SummerPage() {
  const offer = await getOfferByCategory("Lato");
  if (!offer) notFound();
  return (
    <OfferInlineEditor key={offer.cmsId ?? offer.href} offer={offer}>
      <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} offer={offer} />
      <OfferLocationLink label="Wake & Surf Village · Nad Zaporą 21, Poręba" />

      <section className="py-20 md:py-28">
        <div className="site-container">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div><span className="eyebrow"><OfferText field="summerDatesEyebrow" fallback="SHOWCamp 2026" /></span><h2 className="font-display mt-4 text-6xl font-black uppercase leading-[0.88] tracking-tight sm:text-8xl"><OfferText field="summerDatesTitle" fallback="Pięć turnusów." /><br /><span className="text-sky-300"><OfferText field="summerDatesAccent" fallback="Jedno lato." /></span></h2><p className="mt-6 max-w-lg leading-7 text-white/55"><OfferText field="summerDatesBody" fallback="Wybierz termin i zapytaj nas o wolne miejsce." multiline /></p></div>
            <OfferDateList offer={offer} variant="summer" />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] py-20 md:py-28">
        <div className="site-container">
          <span className="eyebrow"><OfferText field="summerActivitiesEyebrow" fallback="Z brzegu prosto do akcji" /></span><h2 className="font-display mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl"><OfferText field="summerActivitiesTitle" fallback="Wybierz sprzęt." /><br /><OfferText field="summerActivitiesAccent" fallback="Resztę pokażemy." /></h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {activities.map(([Icon, titleField, title, bodyField, text]) => (
              <div key={title} className="border border-white/15 bg-black/20 p-7 sm:p-9"><Icon className="size-8 text-orange-400" /><h3 className="font-display mt-12 text-3xl font-black uppercase"><OfferText field={titleField} fallback={title} /></h3><p className="mt-3 leading-7 text-white/55"><OfferText field={bodyField} fallback={text} multiline /></p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28"><div className="site-container grid gap-10 lg:grid-cols-2"><div><span className="eyebrow"><OfferText field="summerBaseEyebrow" fallback="Dobra baza to połowa przygody" /></span><h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-7xl"><OfferText field="summerBaseTitle" fallback="Co czeka" /><br /><OfferText field="summerBaseAccent" fallback="na miejscu?" /></h2></div><Accordion type="single" collapsible className="w-full"><AccordionItem value="sprzet"><AccordionTrigger><OfferText field="summerFaqEquipmentTitle" fallback="Sprzęt i instruktorzy" /></AccordionTrigger><AccordionContent><OfferText field="summerFaqEquipmentBody" fallback="Wakeboard, windsurfing, katamarany, SUP-y, kajaki, łodzie żaglowe, narty wodne i sprzęt motorowodny. Zajęcia dopasowujemy do poziomu uczestników." multiline /></AccordionContent></AccordionItem><AccordionItem value="baza"><AccordionTrigger><OfferText field="summerFaqBaseTitle" fallback="Wake & Surf Village" /></AccordionTrigger><AccordionContent><OfferText field="summerFaqBaseBody" fallback="Prywatne molo, piaszczysta plaża, strefa chill, miejsce grillowe i ogniskowe, sauna, boisko, parking oraz zaplecze sanitarne." multiline /></AccordionContent></AccordionItem><AccordionItem value="jedzenie"><AccordionTrigger><OfferText field="summerFaqFoodTitle" fallback="Surf Bistro i eventy" /></AccordionTrigger><AccordionContent><OfferText field="summerFaqFoodBody" fallback="Menu cateringowe na zamówienie, włoska pizza z pieca opalanego drewnem oraz przestrzeń na imprezy rodzinne i firmowe." multiline /></AccordionContent></AccordionItem><AccordionItem value="lokalizacja"><AccordionTrigger><OfferText field="summerFaqTravelTitle" fallback="Dojazd" /></AccordionTrigger><AccordionContent><OfferText field="summerFaqTravelBody" fallback="Poręba, ul. Nad Zaporą 21 — nad Jeziorem Łąckim, kilka minut od Pszczyny." multiline /></AccordionContent></AccordionItem></Accordion></div></section>
      <PhotoMosaic offer={offer} label="SHOWlato bez filtra" labelField="summerMosaicLabel" imageFields={["summerMosaicOneImageUrl", "summerMosaicTwoImageUrl", "summerMosaicThreeImageUrl"]} photos={[{ src: "/media/summer-wake-hero.jpg", alt: "Wakeboard na Jeziorze Łąckim z lotu ptaka", position: "object-[60%_center]" }, { src: "/media/summer-sailing-drone.jpg", alt: "Katamaran SHOWteam na Jeziorze Łąckim", position: "object-[35%_center]" }, { src: "/media/summer-double-wake.jpg", alt: "Dwie osoby na wakeboardzie za łodzią SHOWteam" }]} />
      <CmsDetails offer={offer} />
      <ContactCta title={<OfferCtaTitle />} applicationOffer={offer.title} />
    </OfferInlineEditor>
  );
}
