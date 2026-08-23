import type { Metadata } from "next";
import { getBookableEquipment } from "@/lib/equipment";
import { ReservationFlow } from "@/components/reservation-flow";
import { EditableImage, EditableText, PageContentEditor } from "@/components/editor/page-content-editor";
import { getPageContent } from "@/lib/page-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Rezerwuj aktywność",
  description: "Zarezerwuj aktywność w WAKE & SURF Village nad Jeziorem Łąckim.",
  alternates: { canonical: "/rezerwacje" },
};

export default async function ReservationsPage() {
  const [equipment, pageContent] = await Promise.all([getBookableEquipment(), getPageContent("reservations")]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return (
    <PageContentEditor page="reservations" initial={pageContent.values}>
      <section className="relative overflow-hidden border-b border-white/10 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <EditableImage field="heroImageUrl" alt="Aktywności SHOWteam" sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/75" />
        <div className="site-container relative">
          <p className="eyebrow"><EditableText field="eyebrow" /></p>
          <h1 className="mt-5 max-w-5xl whitespace-pre-line font-display text-[clamp(4rem,11vw,9rem)] font-black uppercase leading-[.82] tracking-[-.04em]"><EditableText field="title" multiline /></h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg"><EditableText field="description" multiline /></p>
        </div>
      </section>
      <section className="py-12 sm:py-20"><div className="site-container"><ReservationFlow equipment={equipment} today={today} /></div></section>
    </PageContentEditor>
  );
}
