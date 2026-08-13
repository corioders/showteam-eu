import type { Metadata } from "next";
import { Activity, BadgeCheck, HeartPulse, Sailboat, Waves } from "lucide-react";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getOffer } from "@/lib/cms";

export const metadata: Metadata = { title: "Szkolenia i FizjoSPORT", description: "Kurs sternika motorowodnego, żeglarstwo, obozy i FizjoSPORT.", alternates: { canonical: "/oferta/szkolenia" } };
export const dynamic = "force-dynamic";

const programs = [
  { icon: Waves, number: "01", title: "Sternik motorowodny", text: "Teoria i praktyka, przygotowanie do egzaminu państwowego oraz możliwość zdobycia międzynarodowych uprawnień." },
  { icon: Sailboat, number: "02", title: "Żeglarz jachtowy", text: "Nauka od podstaw, manewry, bezpieczeństwo i praktyka na Jeziorze Łąckim dla uczestników od 14. roku życia." },
  { icon: HeartPulse, number: "03", title: "FizjoSPORT", text: "Autorski program fizjoprofilaktyki, diagnostyki posturalnej, terapii i przygotowania motorycznego." },
  { icon: Activity, number: "04", title: "Obozy i grupy", text: "Programy multisportowe, rodzinne i firmowe komponowane z dyscyplin dostępnych w bazie SHOWteam." },
];

export default async function TrainingPage() {
  const offer = await getOffer("szkolenia");
  return (
    <>
      <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} />
      <section className="py-20 md:py-28"><div className="site-container"><div className="mb-12 max-w-4xl"><span className="eyebrow">Uprawnienia i umiejętności</span><h2 className="font-display mt-4 text-6xl font-black uppercase leading-[0.87] tracking-tight sm:text-8xl">Papier to start.<br /><span className="text-orange-500">Liczy się praktyka.</span></h2></div><div className="grid gap-px bg-white/10 md:grid-cols-2">{programs.map(({icon:Icon,number,title,text}) => <div key={title} className="bg-[#080a0b] p-7 sm:p-9"><div className="flex items-center justify-between"><Icon className="size-8 text-sky-300" /><span className="font-display text-4xl font-black text-white/10">{number}</span></div><h3 className="font-display mt-16 text-3xl font-black uppercase sm:text-4xl">{title}</h3><p className="mt-4 max-w-lg leading-7 text-white/55">{text}</p></div>)}</div></div></section>
      <section className="border-y border-white/10 bg-white/[0.03] py-20 md:py-28"><div className="site-container grid gap-12 lg:grid-cols-2"><div><span className="eyebrow">Najczęściej pytacie</span><h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Jak wygląda<br />szkolenie?</h2><div className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/60"><BadgeCheck className="size-5 text-orange-400" /> Terminy ustalamy bezpośrednio</div></div><Accordion type="single" collapsible><AccordionItem value="age"><AccordionTrigger>Od jakiego wieku?</AccordionTrigger><AccordionContent>Kurs sternika motorowodnego i kurs żeglarza jachtowego są dostępne od 14. roku życia, z wymaganymi zgodami dla osób niepełnoletnich.</AccordionContent></AccordionItem><AccordionItem value="format"><AccordionTrigger>Jak łączymy teorię i praktykę?</AccordionTrigger><AccordionContent>Materiał teoretyczny przygotowuje do egzaminu, a część praktyczna odbywa się na wodzie, na sprzęcie używanym w realnych warunkach.</AccordionContent></AccordionItem><AccordionItem value="dates"><AccordionTrigger>Kiedy są terminy?</AccordionTrigger><AccordionContent>Daty kursów i egzaminów są ustalane w sezonie. Zadzwoń lub napisz, aby poznać najbliższy dostępny termin.</AccordionContent></AccordionItem><AccordionItem value="physio"><AccordionTrigger>Dla kogo jest FizjoSPORT?</AccordionTrigger><AccordionContent>Dla dzieci, młodzieży i dorosłych, którzy chcą poprawić jakość ruchu, przygotować się do sportu lub pracować nad postawą pod opieką specjalisty.</AccordionContent></AccordionItem></Accordion></div></section>
      <PhotoMosaic label="Nauka przez ruch" photos={[{ src: "/media/summer-sailing-drone.jpg", alt: "Szkolenie żeglarskie na Jeziorze Łąckim", position: "object-[35%_center]" }, { src: "/media/summer-wake-aerial.jpg", alt: "Szkolenie wakeboardowe z lotu ptaka", position: "object-[60%_center]" }, { src: "/media/summer-sunset-wake.jpg", alt: "Łódź treningowa SHOWteam o zachodzie słońca" }]} />
      <CmsDetails offer={offer} />
      <ContactCta title="Zaczynamy trening?" />
    </>
  );
}
