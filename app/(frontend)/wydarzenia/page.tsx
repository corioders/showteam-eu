import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wydarzenia", description: "Aktualne terminy SHOWCamp, wyjazdów i wydarzeń SHOWteam.", alternates: { canonical: "/wydarzenia" } };

const format = (value: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));

export default async function EventsPage() {
  const events = await getEvents();
  return <section className="pb-24 pt-32 md:pb-32 md:pt-40"><div className="site-container">
    <div className="mb-12 border-b border-white/15 pb-10"><span className="eyebrow">Kalendarz SHOWteam</span><h1 className="font-display mt-4 text-7xl font-black uppercase leading-[0.82] tracking-[-0.055em] sm:text-9xl">Wydarzenia<span className="text-orange-500">.</span></h1><p className="mt-7 max-w-2xl leading-7 text-white/55">Opublikowane terminy pozostają widoczne także po zakończeniu. Aktualną dostępność zawsze potwierdź bezpośrednio z SHOWteam.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">{events.map((event) => <article key={event.id} className="poster-cut grid overflow-hidden border border-white/15 bg-white/[0.025] sm:grid-cols-[0.9fr_1.1fr]">
      <div className="relative min-h-72"><Image src={event.image} alt={event.imageAlt} fill className="object-cover" sizes="(min-width:640px) 35vw, 100vw" /></div>
      <div className="flex flex-col p-6 sm:p-8"><span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-orange-400">{event.category}</span><h2 className="font-display mt-4 text-4xl font-black uppercase leading-none">{event.title}</h2><p className="mt-5 flex gap-2 text-sm text-white/70"><CalendarDays className="size-4 shrink-0 text-sky-300" />{format(event.startDate)}{event.endDate ? ` – ${format(event.endDate)}` : ""}</p><p className="mt-3 flex gap-2 text-sm text-white/70"><MapPin className="size-4 shrink-0 text-orange-400" />{event.location}</p><p className="mt-6 flex-1 leading-7 text-white/55">{event.summary}</p><Button asChild className="mt-7 self-start"><a href={`mailto:biuro@showteam.eu?subject=${encodeURIComponent(event.title)}`}>{event.ctaLabel}</a></Button></div>
    </article>)}</div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(events.map((event) => ({ "@context": "https://schema.org", "@type": "Event", name: event.title, startDate: event.startDate, endDate: event.endDate, eventStatus: "https://schema.org/EventScheduled", location: { "@type": "Place", name: event.location }, image: [event.image.startsWith("http") ? event.image : `https://www.showteam.eu${event.image}`], description: event.summary, organizer: { "@type": "Organization", name: "SHOWteam", url: "https://www.showteam.eu" } }))).replace(/</g, "\\u003c") }} />
  </div></section>;
}
