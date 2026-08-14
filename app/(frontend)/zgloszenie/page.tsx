import type { Metadata } from "next";
import { ApplicationForm } from "@/components/application-form";
import { getApplicationOfferGroups } from "@/lib/application-options";
import { getOffers } from "@/lib/cms";

export const metadata: Metadata = { title: "Formularz zgłoszeniowy", description: "Zgłoszenie uczestnika na wyjazd, SHOWCamp lub szkolenie SHOWteam.", alternates: { canonical: "/zgloszenie" } };
export const revalidate = false;

export default async function ApplicationPage({ searchParams }: { searchParams: Promise<{ oferta?: string }> }) {
  const [offers, query] = await Promise.all([getOffers(), searchParams]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const groups = getApplicationOfferGroups(offers, today);

  return <section className="pb-24 pt-32 md:pb-32 md:pt-40"><div className="site-container grid gap-12 xl:grid-cols-[.65fr_1.35fr]">
    <header className="xl:sticky xl:top-32 xl:self-start"><span className="eyebrow">Zgłoszenia</span><h1 className="font-display mt-4 text-6xl font-black uppercase leading-[.86] tracking-[-.04em] sm:text-8xl">Jedziesz<br /><span className="text-orange-500">z nami?</span></h1><p className="mt-7 max-w-lg leading-7 text-white/55">Wypełnij formularz, a SHOWteam skontaktuje się z Tobą w sprawie szczegółów i dostępności.</p></header>
    <ApplicationForm groups={groups} initialOffer={query.oferta} />
  </div></section>;
}
