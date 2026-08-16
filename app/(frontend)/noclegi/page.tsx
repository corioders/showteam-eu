import type { Metadata } from "next";
import { StayBookingForm } from "@/components/stay-booking-form";

export const metadata: Metadata = { title: "Rezerwuj nocleg nad wodą", description: "Zarezerwuj kontener mieszkalny lub domek holenderski przy WAKE & SURF Village.", alternates: { canonical: "/noclegi" } };
export const dynamic = "force-dynamic";
export default function StaysPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  return <><section className="relative overflow-hidden border-b border-white/10 bg-[url('/media/base-life.jpg')] bg-cover bg-center pb-16 pt-32 sm:pb-24 sm:pt-40"><div className="absolute inset-0 bg-black/75" /><div className="site-container relative"><p className="eyebrow">WAKE & SURF Village · Poręba</p><h1 className="mt-5 max-w-5xl font-display text-[clamp(4rem,11vw,9rem)] font-black uppercase leading-[.82]">Noclegi nad wodą.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/65">Wybierz termin pobytu. Asia sprawdzi dostępność kontenera lub domku i potwierdzi rezerwację.</p></div></section><section className="py-12 sm:py-20"><div className="site-container mx-auto max-w-4xl"><StayBookingForm today={today} /></div></section></>;
}
