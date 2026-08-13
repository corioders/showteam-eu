"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Phone, Sailboat, Waves, Zap } from "lucide-react";
import type { BookableEquipment } from "@/lib/reservations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Slot = { time: string; available: number };
type Result = { reference: string; equipment: string; date: string; time: string; endTime: string };

const categoryIcon = { Woda: Waves, Ląd: Zap, Szkolenie: Sailboat, Inne: Sailboat } as const;

export function ReservationFlow({ equipment, today }: { equipment: BookableEquipment[]; today: string }) {
  const [selectedId, setSelectedId] = useState<number | null>(equipment[0]?.id ?? null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const selected = useMemo(() => equipment.find((item) => item.id === selectedId), [equipment, selectedId]);

  useEffect(() => {
    if (!selectedId || !date) return;
    const controller = new AbortController();
    fetch(`/api/reservations/availability?equipment=${selectedId}&date=${date}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { slots?: Slot[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać terminów.");
        setSlots(body.slots || []);
      })
      .catch((fetchError) => { if (fetchError.name !== "AbortError") setError(fetchError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSlots(false); });
    return () => controller.abort();
  }, [date, selectedId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !date || !time) return setError("Najpierw wybierz sprzęt, datę i godzinę.");
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentId: selectedId, date, time, name: form.get("name"), phone: form.get("phone"), email: form.get("email"), notes: form.get("notes"), website: form.get("website") }),
    });
    const body = await response.json() as Result & { error?: string };
    setSubmitting(false);
    if (!response.ok) {
      setError(body.error || "Nie udało się zapisać rezerwacji.");
      if (response.status === 409) setTime("");
      return;
    }
    setResult(body);
  }

  if (!equipment.length) return (
    <Card className="border-white/10 bg-white/[0.04] p-8 text-center">
      <h2 className="font-display text-3xl font-black uppercase">Rezerwacje ruszą wkrótce</h2>
      <p className="mt-3 text-white/60">Aktualną dostępność sprawdzisz telefonicznie.</p>
      <Button asChild className="mt-6"><a href="tel:+48500128090"><Phone className="size-4" /> +48 500 128 090</a></Button>
    </Card>
  );

  if (result) return (
    <Card className="mx-auto max-w-3xl overflow-hidden border-orange-500/30 bg-neutral-950 p-0">
      <div className="bg-orange-500 p-8 text-black sm:p-12">
        <div className="flex size-14 items-center justify-center rounded-full bg-black text-orange-500"><Check className="size-7" strokeWidth={3} /></div>
        <p className="mt-8 text-xs font-black uppercase tracking-[.2em]">Rezerwacja zapisana</p>
        <h2 className="mt-2 font-display text-5xl font-black uppercase sm:text-7xl">{result.reference}</h2>
      </div>
      <div className="grid gap-6 p-8 sm:grid-cols-2 sm:p-12">
        <div><span className="eyebrow">Sprzęt</span><p className="mt-2 text-xl font-bold">{result.equipment}</p></div>
        <div><span className="eyebrow">Termin</span><p className="mt-2 text-xl font-bold">{result.date} · {result.time}–{result.endTime}</p></div>
        <p className="text-sm leading-6 text-white/55 sm:col-span-2">Zapisz numer rezerwacji. W razie wymagań dotyczących sprzętu obsługa skontaktuje się telefonicznie.</p>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button onClick={() => { setResult(null); setDate(""); setTime(""); }}><ArrowLeft className="size-4" /> Nowa rezerwacja</Button>
          <Button asChild variant="outline"><a href="tel:+48500128090"><Phone className="size-4" /> Zadzwoń</a></Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,.95fr)] lg:items-start">
      <section aria-labelledby="equipment-heading" className="min-w-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><span className="eyebrow">01 / Sprzęt</span><h2 id="equipment-heading" className="mt-2 font-display text-4xl font-black uppercase">Co bierzesz?</h2></div>
          <span className="hidden text-sm text-white/40 sm:block">{equipment.length} pozycji</span>
        </div>
        <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
          {equipment.map((item) => {
            const Icon = categoryIcon[item.category as keyof typeof categoryIcon] || Sailboat;
            const active = item.id === selectedId;
            return (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setTime(""); setSlots([]); setError(""); if (date) setLoadingSlots(true); }} aria-pressed={active} className={`group min-h-52 w-[86%] shrink-0 snap-start border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:w-auto ${active ? "border-orange-500 bg-orange-500 text-black" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}>
                <div className="flex items-start justify-between">
                  <Icon className={`size-7 ${active ? "text-black" : "text-orange-500"}`} />
                  <ChevronRight className={`size-5 transition ${active ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} />
                </div>
                <h3 className="mt-12 font-display text-3xl font-black uppercase leading-none">{item.name}</h3>
                <p className={`mt-3 text-sm leading-5 ${active ? "text-black/65" : "text-white/50"}`}>{item.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Clock3 className="size-3.5" /> {item.durationMinutes} min</div>
              </button>
            );
          })}
        </div>
      </section>

      <Card className="min-w-0 border-white/10 bg-neutral-950 p-5 sm:p-7 lg:sticky lg:top-24">
        <span className="eyebrow">02 / Termin i kontakt</span>
        <div className="mt-3 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <h2 className="font-display text-4xl font-black uppercase">{selected?.name || "Wybierz sprzęt"}</h2>
          {selected && <Badge className="border border-white/15 bg-transparent text-white">{selected.durationMinutes} min</Badge>}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-6">
          <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarDays className="size-4 text-orange-500" /> Data</span><input required type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(""); setSlots([]); setError(""); setLoadingSlots(Boolean(event.target.value)); }} className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 text-base text-white outline-none focus:border-orange-500 [color-scheme:dark]" /></label>
          <fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-bold"><Clock3 className="size-4 text-orange-500" /> Godzina</legend>
            {!date ? <p className="border border-dashed border-white/15 p-5 text-sm text-white/40">Wybierz datę, aby zobaczyć wolne godziny.</p> : loadingSlots ? <p className="p-5 text-sm text-white/45">Sprawdzam wolne terminy…</p> : slots.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((slot) => <button key={slot.time} type="button" onClick={() => setTime(slot.time)} className={`h-11 border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${time === slot.time ? "border-orange-500 bg-orange-500 text-black" : "border-white/15 hover:border-orange-500"}`}>{slot.time}</button>)}</div> : <p className="border border-dashed border-white/15 p-5 text-sm text-white/50">Brak wolnych terminów tego dnia.</p>}
          </fieldset>
          {selected?.notice && <div className="border-l-2 border-orange-500 pl-4 text-sm leading-6 text-white/55">{selected.notice}</div>}
          <div className="grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Imię i nazwisko</span><input required name="name" autoComplete="name" minLength={2} maxLength={120} className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 outline-none focus:border-orange-500" /></label>
            <label><span className="mb-2 block text-sm font-bold">Telefon</span><input required name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="500 000 000" className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 outline-none focus:border-orange-500" /></label>
            <label><span className="mb-2 block text-sm font-bold">E-mail <span className="font-normal text-white/35">(opcjonalnie)</span></span><input name="email" type="email" autoComplete="email" className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 outline-none focus:border-orange-500" /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Uwagi <span className="font-normal text-white/35">(opcjonalnie)</span></span><textarea name="notes" rows={3} maxLength={500} className="w-full resize-y border border-white/15 bg-white/[0.04] p-4 outline-none focus:border-orange-500" /></label>
            <label className="absolute -left-[10000px]" aria-hidden="true">Strona<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          {error && <p role="alert" className="border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <Button type="submit" size="lg" disabled={!selectedId || !date || !time || submitting} className="w-full">{submitting ? "Zapisuję…" : "Rezerwuję termin"}<ArrowRight className="size-4" /></Button>
          <p className="text-center text-xs leading-5 text-white/35">Rezerwacja nie obejmuje płatności online. W kwestiach uprawnień lub warunków wydania sprzętu może skontaktować się obsługa.</p>
        </form>
      </Card>
    </div>
  );
}
