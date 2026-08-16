"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, LoaderCircle, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventInquiryStatusLabels, type EventInquiryStatus } from "@/lib/event-inquiries";

type Inquiry = {
  id: number; reference: string; status: EventInquiryStatus; staffNotes?: string | null; nextContactAt?: string | null; calendarEventId?: string | null;
  eventTypes: ("party" | "canoe")[]; dateOptions: { startDate: string; endDate?: string | null }[]; startTime: string; endTime: string;
  adults: number; children: number; childrenAgeRange?: string | null; activities?: ({ id: number; name: string } | number)[]; specialActivities?: string[];
  cateringOptions?: string[]; cateringNotes?: string | null; attractionOptions?: string[]; attractionNotes?: string | null; wishes?: string | null;
  contactName: string; company?: string | null; phone: string; email: string; createdAt: string;
};
type Settings = { cateringOptions: { label: string }[]; attractionOptions: { label: string }[] };

export function EventInquiriesAdminView() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/event-inquiries", { cache: "no-store" });
    const body = await response.json() as { inquiries?: Inquiry[]; settings?: Settings; error?: string };
    if (!response.ok) setError(body.error || "Nie udało się pobrać zapytań.");
    else { setInquiries(body.inquiries || []); setSettings(body.settings || null); }
    setLoading(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/event-inquiries", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { inquiries?: Inquiry[]; settings?: Settings; error?: string };
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać zapytań.");
        setInquiries(body.inquiries || []);
        setSettings(body.settings || null);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return <main className="site-container py-10 sm:py-16">
    <header><span className="eyebrow">OBSŁUGA KLIENTÓW</span><h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">Imprezy i spływy</h1><p className="mt-4 max-w-2xl leading-7 text-white/55">Oddzwoń, zapisz ustalenia i po potwierdzeniu dodaj konkretny termin do kalendarza.</p></header>
    {settings ? <EventOptionsEditor settings={settings} onChanged={load} /> : null}
    {loading ? <p className="mt-10 flex items-center gap-2 text-white/60"><LoaderCircle className="size-4 animate-spin" /> Ładuję zapytania…</p> : null}
    {error ? <p className="mt-8 border border-red-500/40 bg-red-500/10 p-4 text-red-100">{error}</p> : null}
    {!loading && !inquiries.length ? <p className="mt-10 border border-white/15 p-8 text-white/55">Nie ma jeszcze zapytań o imprezy ani spływy.</p> : null}
    <div className="mt-10 grid gap-5">{inquiries.map((inquiry) => <InquiryCard key={inquiry.id} inquiry={inquiry} onChanged={load} />)}</div>
  </main>;
}

function InquiryCard({ inquiry, onChanged }: { inquiry: Inquiry; onChanged: () => Promise<void> }) {
  const [status, setStatus] = useState(inquiry.status);
  const [notes, setNotes] = useState(inquiry.staffNotes || "");
  const [nextContactAt, setNextContactAt] = useState(inquiry.nextContactAt?.slice(0, 16) || "");
  const firstDate = inquiry.dateOptions[0];
  const [event, setEvent] = useState({ title: `${inquiry.eventTypes.includes("canoe") ? "Spływ" : "Impreza"} · ${inquiry.contactName}`, startDate: firstDate?.startDate.slice(0, 10) || "", endDate: firstDate?.endDate?.slice(0, 10) || "", startTime: inquiry.startTime, endTime: inquiry.endTime, allDay: false, blocksBase: true });
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setWorking(true); setMessage("");
    const response = await fetch("/api/admin/event-inquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inquiry.id, status, staffNotes: notes, nextContactAt: nextContactAt ? new Date(nextContactAt).toISOString() : "" }) });
    const body = await response.json() as { error?: string };
    setWorking(false); setMessage(response.ok ? "Zapisano." : body.error || "Nie udało się zapisać.");
    if (response.ok) await onChanged();
  }

  async function addToCalendar() {
    setWorking(true); setMessage("");
    const response = await fetch("/api/admin/event-inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inquiry.id, ...event }) });
    const body = await response.json() as { error?: string };
    setWorking(false); setMessage(response.ok ? "Dodano do kalendarza i oznaczono jako potwierdzone." : body.error || "Nie udało się dodać wydarzenia.");
    if (response.ok) await onChanged();
  }

  const activities = (inquiry.activities || []).map((activity) => typeof activity === "object" ? activity.name : `Aktywność ${activity}`);
  return <details className="group border border-white/15 bg-white/[.02]" open={inquiry.status === "new" || inquiry.status === "callback"}>
    <summary className="cursor-pointer list-none p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="font-mono text-xs text-orange-400">{inquiry.reference}</span><h2 className="mt-2 text-xl font-black">{inquiry.contactName}{inquiry.company ? ` · ${inquiry.company}` : ""}</h2><p className="mt-2 text-sm text-white/55">{inquiry.eventTypes.map((type) => type === "party" ? "Impreza" : "Spływ").join(" + ")} · {inquiry.adults} dorosłych · {inquiry.children} dzieci</p></div><span className="border border-current px-2 py-1 text-xs font-bold uppercase text-orange-300">{eventInquiryStatusLabels[inquiry.status]}</span></div></summary>
    <div className="grid gap-8 border-t border-white/10 p-5 sm:p-6 lg:grid-cols-2">
      <div className="grid content-start gap-5">
        <div className="flex flex-wrap gap-2"><a href={`tel:${inquiry.phone}`} className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-3 font-bold hover:border-orange-500"><Phone className="size-4" /> {inquiry.phone}</a><a href={`mailto:${inquiry.email}`} className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-3 font-bold hover:border-orange-500"><Mail className="size-4" /> {inquiry.email}</a></div>
        <Info title="Możliwe terminy">{inquiry.dateOptions.map((date, index) => <span key={index} className="block">{date.startDate.slice(0, 10)}{date.endDate ? ` – ${date.endDate.slice(0, 10)}` : ""}</span>)}</Info>
        <Info title="Godziny">{inquiry.startTime}–{inquiry.endTime}</Info>
        {inquiry.children ? <Info title="Wiek dzieci">{inquiry.childrenAgeRange}</Info> : null}
        <Info title="Aktywności">{[...activities, ...(inquiry.specialActivities || [])].join(", ") || "Brak wskazań"}</Info>
        <Info title="Catering">{[...(inquiry.cateringOptions || []), inquiry.cateringNotes || ""].filter(Boolean).join(" · ") || "Brak wskazań"}</Info>
        <Info title="Atrakcje">{[...(inquiry.attractionOptions || []), inquiry.attractionNotes || ""].filter(Boolean).join(" · ") || "Brak wskazań"}</Info>
        {inquiry.wishes ? <Info title="Dodatkowe życzenia">{inquiry.wishes}</Info> : null}
      </div>
      <div className="grid content-start gap-5">
        <label className="editor-field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as EventInquiryStatus)}>{Object.entries(eventInquiryStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="editor-field"><span>Następny kontakt</span><input type="datetime-local" value={nextContactAt} onChange={(event) => setNextContactAt(event.target.value)} /></label>
        <label className="editor-field"><span>Notatka dla obsługi</span><textarea rows={5} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <Button onClick={() => void save()} disabled={working}><Check className="size-4" /> Zapisz obsługę zapytania</Button>
        {!inquiry.calendarEventId ? <div className="mt-3 border-t border-white/15 pt-6"><h3 className="font-display text-2xl font-black uppercase">Potwierdzony termin</h3><p className="mt-2 text-sm leading-6 text-white/50">Sprawdź ustaloną datę. Dodanie wydarzenia oznaczy zapytanie jako potwierdzone.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="editor-field sm:col-span-2"><span>Nazwa wydarzenia</span><input value={event.title} onChange={(input) => setEvent((value) => ({ ...value, title: input.target.value }))} /></label>
          <label className="editor-field"><span>Od</span><input type="date" value={event.startDate} onChange={(input) => setEvent((value) => ({ ...value, startDate: input.target.value }))} /></label>
          <label className="editor-field"><span>Do (opcjonalnie)</span><input type="date" min={event.startDate} value={event.endDate} onChange={(input) => setEvent((value) => ({ ...value, endDate: input.target.value }))} /></label>
          {!event.allDay ? <><label className="editor-field"><span>Godzina od</span><input type="time" value={event.startTime} onChange={(input) => setEvent((value) => ({ ...value, startTime: input.target.value }))} /></label><label className="editor-field"><span>Godzina do</span><input type="time" value={event.endTime} onChange={(input) => setEvent((value) => ({ ...value, endTime: input.target.value }))} /></label></> : null}
        </div><label className="mt-3 flex min-h-12 items-center gap-3 border border-white/15 p-3 font-bold"><input type="checkbox" checked={event.allDay} onChange={(input) => setEvent((value) => ({ ...value, allDay: input.target.checked }))} className="size-5 accent-orange-500" /> Cały dzień</label><label className="mt-3 flex min-h-12 items-center gap-3 border border-red-500/35 p-3 font-bold"><input type="checkbox" checked={event.blocksBase} onChange={(input) => setEvent((value) => ({ ...value, blocksBase: input.target.checked }))} className="size-5 accent-orange-500" /> Blokuje rezerwacje całej bazy</label><Button className="mt-4 w-full" onClick={() => void addToCalendar()} disabled={working}><CalendarPlus className="size-4" /> Dodaj do kalendarza</Button></div> : <p className="border border-emerald-500/35 bg-emerald-500/10 p-4 text-emerald-100">To zapytanie ma już wydarzenie w kalendarzu.</p>}
        {message ? <p className="text-sm text-orange-200" role="status">{message}</p> : null}
      </div>
    </div>
  </details>;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) { return <div><h3 className="text-xs font-bold uppercase tracking-wider text-white/35">{title}</h3><div className="mt-1 leading-6 text-white/75">{children}</div></div>; }

function EventOptionsEditor({ settings, onChanged }: { settings: Settings; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [catering, setCatering] = useState(() => settings.cateringOptions.map((option) => option.label));
  const [attractions, setAttractions] = useState(() => settings.attractionOptions.map((option) => option.label));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setWorking(true); setMessage("");
    const response = await fetch("/api/admin/event-inquiries", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cateringOptions: catering, attractionOptions: attractions }) });
    const body = await response.json() as { error?: string };
    setWorking(false); setMessage(response.ok ? "Propozycje zapisane." : body.error || "Nie udało się zapisać.");
    if (response.ok) await onChanged();
  }
  return <section className="mt-8 border border-white/15 p-4 sm:p-6"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left font-bold" onClick={() => setOpen((value) => !value)}><span className="flex items-center gap-2"><Pencil className="size-4 text-orange-400" /> Edytuj propozycje w formularzu</span><span aria-hidden="true">{open ? "−" : "+"}</span></button>{open ? <div className="mt-5 grid gap-8 border-t border-white/10 pt-5 lg:grid-cols-2"><OptionList title="Catering" values={catering} onChange={setCatering} /><OptionList title="Atrakcje dodatkowe" values={attractions} onChange={setAttractions} /><div className="lg:col-span-2"><Button onClick={() => void save()} disabled={working}><Check className="size-4" /> {working ? "Zapisuję…" : "Zapisz propozycje"}</Button>{message ? <p className="mt-3 text-sm text-orange-200">{message}</p> : null}</div></div> : null}</section>;
}

function OptionList({ title, values, onChange }: { title: string; values: string[]; onChange: (values: string[]) => void }) {
  return <div><h3 className="font-display text-2xl font-black uppercase">{title}</h3><div className="mt-3 grid gap-2">{values.map((value, index) => <div key={index} className="flex gap-2"><input aria-label={`${title} ${index + 1}`} className="min-h-11 flex-1 border border-white/15 bg-black px-3" value={value} maxLength={80} onChange={(event) => onChange(values.map((item, position) => position === index ? event.target.value : item))} /><Button type="button" variant="outline" size="icon" aria-label={`Usuń: ${value}`} onClick={() => onChange(values.filter((_, position) => position !== index))}><Trash2 className="size-4" /></Button></div>)}</div><Button type="button" variant="outline" className="mt-3" onClick={() => onChange([...values, ""])}><Plus className="size-4" /> Dodaj propozycję</Button></div>;
}
