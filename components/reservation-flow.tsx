"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, CloudSun, Phone, Sailboat, Waves, Wind, Zap } from "lucide-react";
import { addDaysToBookingDate, bookingDateChoices, type BookableEquipment } from "@/lib/reservations";
import { weatherProfileLabel } from "@/lib/wind-recommendations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Slot = { time: string; available: number; recommendation?: { recommended: boolean; level: "best" | "good" | "regular"; basis: "forecast" | "typical" | "none"; label?: string; detail?: string; windKmh?: number; gustKmh?: number } };
type WindStatus = "forecast" | "outside-range" | "unavailable";
type Result = { reference: string; equipment: string; date: string; time: string; endTime: string };

const categoryIcon = { Woda: Waves, Ląd: Zap, Szkolenie: Sailboat, Inne: Sailboat } as const;

export function ReservationFlow({ equipment, today }: { equipment: BookableEquipment[]; today: string }) {
  const [selectedId, setSelectedId] = useState<number | null>(equipment[0]?.id ?? null);
  const [date, setDate] = useState(today);
  const [visibleStart, setVisibleStart] = useState(today);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [windStatus, setWindStatus] = useState<WindStatus | null>(null);
  const [recommendationNote, setRecommendationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const selected = useMemo(() => equipment.find((item) => item.id === selectedId), [equipment, selectedId]);
  const visibleDates = useMemo(() => bookingDateChoices(visibleStart), [visibleStart]);

  function selectDate(nextDate: string) {
    if (nextDate === date) return;
    setDate(nextDate);
    setTime("");
    setSlots([]);
    setWindStatus(null);
    setError("");
    setLoadingSlots(true);
  }

  useEffect(() => {
    if (!selectedId || !date || result) return;
    const controller = new AbortController();
    fetch(`/api/reservations/availability?equipment=${selectedId}&date=${date}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { slots?: Slot[]; windStatus?: WindStatus; recommendationNote?: string | null; error?: string };
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać terminów.");
        setSlots(body.slots || []);
        setWindStatus(body.windStatus || null);
        setRecommendationNote(body.recommendationNote || "");
      })
      .catch((fetchError) => { if (fetchError.name !== "AbortError") setError(fetchError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSlots(false); });
    return () => controller.abort();
  }, [date, result, selectedId]);

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
      <h2 className="font-display text-3xl font-black uppercase">Rezerwacja online jest teraz niedostępna</h2>
      <p className="mt-3 text-white/60">Zadzwoń do nas — sprawdzimy dostępność sprzętu.</p>
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
        <p className="text-sm leading-6 text-white/55 sm:col-span-2">Zapisz numer rezerwacji. Jeśli warunki nie będą pasować do wybranego sprzętu, ekipa zaproponuje najlepszą dostępną alternatywę.</p>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button onClick={() => { setResult(null); setDate(today); setVisibleStart(today); setTime(""); setLoadingSlots(true); }}><ArrowLeft className="size-4" /> Nowa rezerwacja</Button>
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
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setTime(""); setSlots([]); setWindStatus(null); setRecommendationNote(""); setError(""); if (date) setLoadingSlots(true); }} aria-pressed={active} className={`group min-h-52 w-[86%] shrink-0 snap-start border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:w-auto ${active ? "border-orange-500 bg-orange-500 text-black" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}>
                <div className="flex items-start justify-between">
                  <Icon className={`size-7 ${active ? "text-black" : "text-orange-500"}`} />
                  <ChevronRight className={`size-5 transition ${active ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} />
                </div>
                <h3 className="mt-12 font-display text-3xl font-black uppercase leading-none">{item.name}</h3>
                <p className={`mt-3 text-sm leading-5 ${active ? "text-black/65" : "text-white/50"}`}>{item.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Clock3 className="size-3.5" /> {item.durationMinutes} min</div>
                <div className={`mt-2 flex items-center gap-2 text-[.68rem] font-bold uppercase tracking-wider ${active ? "text-black/70" : "text-sky-300"}`}><Wind className="size-3.5" /> {weatherProfileLabel(item.weatherProfile)}</div>
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
          <fieldset aria-labelledby="booking-date-label">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span id="booking-date-label" className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="size-4 text-orange-500" /> Data</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Poprzedni tydzień" disabled={visibleStart === today} onClick={() => setVisibleStart(addDaysToBookingDate(visibleStart, -7) < today ? today : addDaysToBookingDate(visibleStart, -7))} className="grid size-10 place-items-center border border-white/15 transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-25"><ChevronLeft className="size-4" /></button>
                <button type="button" aria-label="Następny tydzień" onClick={() => setVisibleStart(addDaysToBookingDate(visibleStart, 7))} className="grid size-10 place-items-center border border-white/15 transition hover:border-orange-500"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Najbliższe daty">
              {visibleDates.map((value, index) => {
                const parsed = new Date(`${value}T12:00:00Z`);
                const active = date === value;
                const dayLabel = index === 0 && value === today ? "Dziś" : new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone: "UTC" }).format(parsed).replace(".", "");
                return <button key={value} type="button" aria-pressed={active} onClick={() => selectDate(value)} className={`min-h-20 border px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active ? "border-orange-500 bg-orange-500 text-black" : "border-white/15 bg-white/[0.035] hover:border-orange-500"}`}>
                  <span className={`block text-[.65rem] font-bold uppercase tracking-wider ${active ? "text-black/60" : "text-white/45"}`}>{dayLabel}</span>
                  <span className="mt-1 block font-display text-2xl font-black leading-none">{parsed.getUTCDate()}</span>
                  <span className={`mt-1 block text-[.65rem] uppercase ${active ? "text-black/60" : "text-white/35"}`}>{new Intl.DateTimeFormat("pl-PL", { month: "short", timeZone: "UTC" }).format(parsed).replace(".", "")}</span>
                </button>;
              })}
            </div>
            <label className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-bold text-white/55">
              <span>Inna data</span>
              <input required type="date" min={today} value={date} onChange={(event) => { if (!event.target.value) return; setVisibleStart(event.target.value); selectDate(event.target.value); }} className="h-10 min-w-0 w-full border-0 bg-transparent text-right text-base text-white outline-none [color-scheme:dark]" />
            </label>
          </fieldset>
          <fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-bold"><Clock3 className="size-4 text-orange-500" /> Godzina</legend>
            {!date ? <p className="border border-dashed border-white/15 p-5 text-sm text-white/40">Wybierz datę, aby zobaczyć wolne godziny.</p> : loadingSlots ? <p className="p-5 text-sm text-white/45">Sprawdzam wolne terminy i wiatr…</p> : slots.length ? <SlotPicker slots={slots} selectedTime={time} onSelect={setTime} /> : <p className="border border-dashed border-white/15 p-5 text-sm text-white/50">Brak wolnych terminów tego dnia.</p>}
            {!loadingSlots && windStatus ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/40">{windStatus === "forecast" ? <Wind className="mt-0.5 size-3.5 shrink-0 text-sky-300" /> : <CloudSun className="mt-0.5 size-3.5 shrink-0 text-white/35" />}{windStatus === "forecast" ? "Polecane godziny uwzględniają krótkoterminową prognozę wiatru dla Jeziora Łąckiego." : windStatus === "outside-range" ? "Dla dalszych terminów pokazujemy typowe godziny ustawione przez ekipę. Prognoza pojawi się bliżej daty." : "Prognoza jest chwilowo niedostępna; pokazujemy godziny ustawione przez ekipę."}</p> : null}
            {time && slots.find((slot) => slot.time === time)?.recommendation?.detail ? <p className="mt-3 border-l-2 border-sky-400 pl-3 text-sm leading-5 text-white/60">{slots.find((slot) => slot.time === time)?.recommendation?.detail}</p> : null}
          </fieldset>
          {recommendationNote ? <div className="border-l-2 border-sky-400 pl-4 text-sm leading-6 text-white/55">{recommendationNote}</div> : null}
          {selected?.notice && <div className="border-l-2 border-orange-500 pl-4 text-sm leading-6 text-white/55">{selected.notice}</div>}
          <div className="border border-white/10 bg-white/[.035] p-4 text-sm leading-6 text-white/60"><strong className="text-white">Warun może się zmienić — to nie problem.</strong> Jeśli SUP, katamaran albo wake nie będą najlepszą opcją, ekipa powie, co w danym momencie działa najlepiej, i zaproponuje inny dostępny sprzęt.</div>
          <div className="grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Imię i nazwisko</span><input required name="name" autoComplete="name" minLength={2} maxLength={120} className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 outline-none focus:border-orange-500" /></label>
            <label><span className="mb-2 block text-sm font-bold">Telefon</span><input required name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="500 000 000" className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 outline-none focus:border-orange-500" /></label>
            <label><span className="mb-2 block text-sm font-bold">E-mail</span><input required name="email" type="email" autoComplete="email" placeholder="adres@email.pl" className="h-12 w-full border border-white/15 bg-white/[0.04] px-4 outline-none focus:border-orange-500" /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Uwagi <span className="font-normal text-white/35">(opcjonalnie)</span></span><textarea name="notes" rows={3} maxLength={500} className="w-full resize-y border border-white/15 bg-white/[0.04] p-4 outline-none focus:border-orange-500" /></label>
            <label className="absolute -left-[10000px]" aria-hidden="true">Strona<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          {error && <p role="alert" className="border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <Button type="submit" size="lg" disabled={!selectedId || !date || !time || submitting} className="w-full">{submitting ? "Zapisuję…" : "Rezerwuję termin"}<ArrowRight className="size-4" /></Button>
          <p className="text-center text-xs leading-5 text-white/35">Prognoza jest podpowiedzią, nie gwarancją warunków. Rezerwacja nie obejmuje płatności online. Dane pogodowe: Open-Meteo.</p>
        </form>
      </Card>
    </div>
  );
}

function SlotPicker({ slots, selectedTime, onSelect }: { slots: Slot[]; selectedTime: string; onSelect: (time: string) => void }) {
  const recommended = slots.filter((slot) => slot.recommendation?.recommended);
  const regular = slots.filter((slot) => !slot.recommendation?.recommended);
  return <div className="space-y-4">
    {recommended.length ? <div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-sky-300">Polecane na ten warun</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{recommended.map((slot) => <SlotButton key={slot.time} slot={slot} selected={selectedTime === slot.time} onSelect={onSelect} />)}</div></div> : null}
    {regular.length ? <div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-white/35">Pozostałe wolne</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{regular.map((slot) => <SlotButton key={slot.time} slot={slot} selected={selectedTime === slot.time} onSelect={onSelect} />)}</div></div> : null}
  </div>;
}

function SlotButton({ slot, selected, onSelect }: { slot: Slot; selected: boolean; onSelect: (time: string) => void }) {
  return <button type="button" onClick={() => onSelect(slot.time)} data-recommended={slot.recommendation?.recommended || undefined} className={`min-h-12 border px-2 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${selected ? "border-orange-500 bg-orange-500 text-black" : slot.recommendation?.recommended ? "border-sky-400/60 bg-sky-400/10 hover:border-sky-300" : "border-white/15 hover:border-orange-500"}`}><span className="block">{slot.time}</span>{slot.recommendation?.recommended ? <span className={`mt-0.5 block text-[.58rem] uppercase tracking-wide ${selected ? "text-black/60" : "text-sky-300"}`}>{slot.recommendation.label}</span> : null}</button>;
}
