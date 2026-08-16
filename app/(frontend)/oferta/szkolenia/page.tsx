import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity, BadgeCheck, HeartPulse, Sailboat, Waves } from "lucide-react";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { OfferCtaTitle, OfferInlineEditor, OfferLocationLink, OfferText } from "@/components/editor/offer-inline-editor";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getOfferByCategory } from "@/lib/cms";

export const metadata: Metadata = { title: "Szkolenia i FizjoSPORT", description: "Kurs sternika motorowodnego, żeglarstwo, obozy i FizjoSPORT.", alternates: { canonical: "/oferta/szkolenia" } };
export const revalidate = false;

const programs = [
  { icon: Waves, number: "01", titleField: "trainingMotorboatTitle", title: "Sternik motorowodny", bodyField: "trainingMotorboatBody", text: "Teoria i praktyka, przygotowanie do egzaminu państwowego oraz możliwość zdobycia międzynarodowych uprawnień." },
  { icon: Sailboat, number: "02", titleField: "trainingSailingTitle", title: "Żeglarz jachtowy", bodyField: "trainingSailingBody", text: "Nauka od podstaw, manewry, bezpieczeństwo i praktyka na Jeziorze Łąckim dla uczestników od 14. roku życia." },
  { icon: HeartPulse, number: "03", titleField: "trainingPhysioTitle", title: "FizjoSPORT", bodyField: "trainingPhysioBody", text: "Autorski program fizjoprofilaktyki, diagnostyki posturalnej, terapii i przygotowania motorycznego." },
  { icon: Activity, number: "04", titleField: "trainingCampsTitle", title: "Obozy i grupy", bodyField: "trainingCampsBody", text: "Programy multisportowe, rodzinne i firmowe komponowane z dyscyplin dostępnych w bazie SHOWteam." },
];

export default async function TrainingPage() {
  const offer = await getOfferByCategory("Szkolenia");
  if (!offer) notFound();
  return (
    <OfferInlineEditor key={offer.cmsId ?? offer.href} offer={offer}>
      <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} offer={offer} />
      <OfferLocationLink label="Baza szkoleń · Nad Zaporą 21, Poręba" />
      <section className="py-20 md:py-28"><div className="site-container"><div className="mb-12 max-w-4xl"><span className="eyebrow"><OfferText field="trainingProgramsEyebrow" fallback="Uprawnienia i umiejętności" /></span><h2 className="font-display mt-4 text-6xl font-black uppercase leading-[0.87] tracking-tight sm:text-8xl"><OfferText field="trainingProgramsTitle" fallback="Papier to start." /><br /><span className="text-orange-500"><OfferText field="trainingProgramsAccent" fallback="Liczy się praktyka." /></span></h2></div><div className="grid gap-px bg-white/10 md:grid-cols-2">{programs.map(({icon:Icon,number,titleField,title,bodyField,text}) => <div key={title} className="bg-[#080a0b] p-7 sm:p-9"><div className="flex items-center justify-between"><Icon className="size-8 text-sky-300" /><span className="font-display text-4xl font-black text-white/10">{number}</span></div><h3 className="font-display mt-16 text-3xl font-black uppercase sm:text-4xl"><OfferText field={titleField} fallback={title} /></h3><p className="mt-4 max-w-lg leading-7 text-white/55"><OfferText field={bodyField} fallback={text} multiline /></p></div>)}</div></div></section>
      <section className="border-y border-white/10 bg-white/[0.03] py-20 md:py-28"><div className="site-container grid gap-12 lg:grid-cols-2"><div><span className="eyebrow"><OfferText field="trainingFaqEyebrow" fallback="Najczęściej pytacie" /></span><h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-7xl"><OfferText field="trainingFaqTitle" fallback="Jak wygląda" /><br /><OfferText field="trainingFaqAccent" fallback="szkolenie?" /></h2><div className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/60"><BadgeCheck className="size-5 text-orange-400" /> <OfferText field="trainingDatesNote" fallback="Terminy ustalamy bezpośrednio" /></div></div><Accordion type="single" collapsible><AccordionItem value="age"><AccordionTrigger><OfferText field="trainingAgeTitle" fallback="Od jakiego wieku?" /></AccordionTrigger><AccordionContent><OfferText field="trainingAgeBody" fallback="Kurs sternika motorowodnego i kurs żeglarza jachtowego są dostępne od 14. roku życia, z wymaganymi zgodami dla osób niepełnoletnich." multiline /></AccordionContent></AccordionItem><AccordionItem value="format"><AccordionTrigger><OfferText field="trainingFormatTitle" fallback="Jak łączymy teorię i praktykę?" /></AccordionTrigger><AccordionContent><OfferText field="trainingFormatBody" fallback="Materiał teoretyczny przygotowuje do egzaminu, a część praktyczna odbywa się na wodzie, na sprzęcie używanym w realnych warunkach." multiline /></AccordionContent></AccordionItem><AccordionItem value="dates"><AccordionTrigger><OfferText field="trainingWhenTitle" fallback="Kiedy są terminy?" /></AccordionTrigger><AccordionContent><OfferText field="trainingWhenBody" fallback="Daty kursów i egzaminów są ustalane w sezonie. Zadzwoń lub napisz, aby poznać najbliższy dostępny termin." multiline /></AccordionContent></AccordionItem><AccordionItem value="physio"><AccordionTrigger><OfferText field="trainingPhysioFaqTitle" fallback="Dla kogo jest FizjoSPORT?" /></AccordionTrigger><AccordionContent><OfferText field="trainingPhysioFaqBody" fallback="Dla dzieci, młodzieży i dorosłych, którzy chcą poprawić jakość ruchu, przygotować się do sportu lub pracować nad postawą pod opieką specjalisty." multiline /></AccordionContent></AccordionItem></Accordion></div></section>
      <PhotoMosaic label="Nauka przez ruch" photos={[{ src: "/media/summer-sailing-drone.jpg", alt: "Szkolenie żeglarskie na Jeziorze Łąckim", position: "object-[35%_center]" }, { src: "/media/summer-wake-aerial.jpg", alt: "Szkolenie wakeboardowe z lotu ptaka", position: "object-[60%_center]" }, { src: "/media/summer-sunset-wake.jpg", alt: "Łódź treningowa SHOWteam o zachodzie słońca" }]} />
      <CmsDetails offer={offer} />
      <ContactCta title={<OfferCtaTitle />} applicationOffer={offer.title} />
    </OfferInlineEditor>
  );
}
