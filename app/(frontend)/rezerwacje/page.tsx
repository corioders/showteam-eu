import type { Metadata } from "next";
import { getBookableEquipment } from "@/lib/equipment";
import { ReservationFlow } from "@/components/reservation-flow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Rezerwacje sprzętu",
  description: "Zarezerwuj online SUP, kajak, sprzęt żeglarski, wodny lub rower w bazie SHOWteam nad Jeziorem Łąckim.",
  alternates: { canonical: "/rezerwacje" },
};

export default async function ReservationsPage() {
  const equipment = await getBookableEquipment();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-[url('/media/legacy-light-trails-bottom.jpg')] bg-cover bg-center pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="absolute inset-0 bg-black/75" />
        <div className="site-container relative">
          <p className="eyebrow">Wake & Surf Village · Poręba</p>
          <h1 className="mt-5 max-w-5xl font-display text-[clamp(4rem,11vw,9rem)] font-black uppercase leading-[.82] tracking-[-.04em]">Sprzęt czeka.<br /><span className="text-orange-500">Wybierz godzinę.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">Wybierz sprzęt i wolny termin. Bez telefonu, kolejek i zgadywania — numer rezerwacji dostajesz od razu.</p>
        </div>
      </section>
      <section className="py-12 sm:py-20"><div className="site-container"><ReservationFlow equipment={equipment} today={today} /></div></section>
    </>
  );
}
