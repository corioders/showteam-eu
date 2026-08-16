"use client";

import { useState } from "react";
import { CalendarPlus, CheckCircle2, RotateCcw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Activity = { id: number; name: string };
type DateOption = { startDate: string; endDate: string };
type Values = {
  eventTypes: string[]; dateOptions: DateOption[]; startTime: string; endTime: string;
  adults: number; children: number; childrenAgeRange: string; activities: number[]; specialActivities: string[];
  cateringOptions: string[]; cateringNotes: string; attractionOptions: string[];
  attractionNotes: string; wishes: string; contactName: string; company: string;
  phone: string; email: string; privacyConsent: boolean;
};

const emptyValues = (): Values => ({
  eventTypes: [], dateOptions: [{ startDate: "", endDate: "" }], startTime: "10:00", endTime: "18:00",
  adults: 1, children: 0, childrenAgeRange: "", activities: [], specialActivities: [], cateringOptions: [], cateringNotes: "",
  attractionOptions: [], attractionNotes: "", wishes: "", contactName: "", company: "", phone: "", email: "", privacyConsent: false,
});

export function EventInquiryForm({ activities, catering, attractions, today }: { activities: Activity[]; catering: string[]; attractions: string[]; today: string }) {
  const [values, setValues] = useState<Values>(emptyValues);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  function update<K extends keyof Values>(field: K, value: Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function toggle<T extends string | number>(field: "eventTypes" | "activities" | "specialActivities" | "cateringOptions" | "attractionOptions", value: T) {
    setValues((current) => {
      const selected = current[field] as T[];
      return { ...current, [field]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] };
    });
    setError("");
  }

  function updateDate(index: number, field: keyof DateOption, value: string) {
    update("dateOptions", values.dateOptions.map((option, position) => position === index ? { ...option, [field]: value } : option));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");
    const response = await fetch("/api/event-inquiries", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, website: "" }),
    });
    const body = await response.json() as { error?: string; reference?: string };
    setWorking(false);
    if (!response.ok || !body.reference) return setError(body.error || "Nie udało się wysłać zapytania.");
    setReference(body.reference);
    setValues(emptyValues());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (reference) return <div className="mx-auto max-w-3xl border border-emerald-400/30 bg-emerald-400/[.06] p-8 sm:p-12" role="status">
    <CheckCircle2 className="size-12 text-emerald-300" />
    <h2 className="mt-6 font-display text-4xl font-black uppercase sm:text-6xl">Dzięki! Zadzwonimy.</h2>
    <p className="mt-5 text-lg leading-8 text-white/70">To niezobowiązujące zapytanie. Zadzwonimy, aby ustalić szczegóły.</p>
    <p className="mt-4 font-mono text-sm text-white/45">Numer zapytania: {reference}</p>
    <Button className="mt-8" onClick={() => setReference("")}>Wyślij kolejne zapytanie</Button>
  </div>;

  return <form onSubmit={(event) => void submit(event)} className="mx-auto grid max-w-5xl gap-12" noValidate>
    <FormSection number="01" title="Co organizujemy?" description="Możesz zaznaczyć obie opcje.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice checked={values.eventTypes.includes("party")} onChange={() => toggle("eventTypes", "party")} label="Impreza" />
        <Choice checked={values.eventTypes.includes("canoe")} onChange={() => toggle("eventTypes", "canoe")} label="Spływ" />
      </div>
    </FormSection>

    <FormSection number="02" title="Kiedy?" description="Dodaj wszystkie orientacyjne terminy, które Wam pasują. Jeden termin może być jednym dniem albo zakresem.">
      <div className="grid gap-4">{values.dateOptions.map((option, index) => <div key={index} className="grid gap-3 border border-white/15 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={`Termin ${index + 1} — od`}><input required type="date" min={today} value={option.startDate} onChange={(event) => updateDate(index, "startDate", event.target.value)} /></Field>
        <Field label="Do (opcjonalnie)"><input type="date" min={option.startDate || today} value={option.endDate} onChange={(event) => updateDate(index, "endDate", event.target.value)} /></Field>
        {values.dateOptions.length > 1 ? <Button type="button" variant="outline" size="icon" aria-label={`Usuń termin ${index + 1}`} onClick={() => update("dateOptions", values.dateOptions.filter((_, position) => position !== index))}><Trash2 className="size-4" /></Button> : null}
      </div>)}</div>
      <Button type="button" variant="outline" className="mt-4" onClick={() => update("dateOptions", [...values.dateOptions, { startDate: "", endDate: "" }])}><CalendarPlus className="size-4" /> Dodaj kolejny możliwy termin</Button>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Planowana godzina rozpoczęcia / przyjazdu"><input required type="time" value={values.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field>
        <Field label="Planowana godzina zakończenia / wyjazdu"><input required type="time" value={values.endTime} onChange={(event) => update("endTime", event.target.value)} /></Field>
      </div>
    </FormSection>

    <FormSection number="03" title="Dla ilu osób?">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Dorośli"><input required type="number" min={0} max={1000} value={values.adults} onChange={(event) => update("adults", event.target.valueAsNumber)} /></Field>
        <Field label="Dzieci"><input required type="number" min={0} max={1000} value={values.children} onChange={(event) => update("children", event.target.valueAsNumber)} /></Field>
        <Field label="Wiek dzieci" hint="Np. 6–12 lat"><input required={values.children > 0} disabled={values.children === 0} value={values.childrenAgeRange} onChange={(event) => update("childrenAgeRange", event.target.value)} /></Field>
      </div>
    </FormSection>

    <FormSection number="04" title="Z czego chcecie skorzystać?" description="To niewiążąca lista — szczegóły ustalimy przez telefon.">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activities.map((activity) => <Choice key={activity.id} checked={values.activities.includes(activity.id)} onChange={() => toggle("activities", activity.id)} label={activity.name} />)}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Choice checked={values.specialActivities.includes("Spływ kajakowy")} onChange={() => toggle("specialActivities", "Spływ kajakowy")} label="Spływ kajakowy" /><Choice checked={values.specialActivities.includes("Nocny spływ kajakowy")} onChange={() => toggle("specialActivities", "Nocny spływ kajakowy")} label="Nocny spływ kajakowy" /></div>
    </FormSection>

    <FormSection number="05" title="Catering" description="Zaznacz inspiracje albo opisz własny pomysł.">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catering.map((option) => <Choice key={option} checked={values.cateringOptions.includes(option)} onChange={() => toggle("cateringOptions", option)} label={option} />)}</div>
      <Field label="Własny pomysł na catering"><textarea rows={4} maxLength={2000} value={values.cateringNotes} onChange={(event) => update("cateringNotes", event.target.value)} /></Field>
    </FormSection>

    <FormSection number="06" title="Atrakcje dodatkowe" description="To propozycje — dopasujemy program do Was.">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{attractions.map((option) => <Choice key={option} checked={values.attractionOptions.includes(option)} onChange={() => toggle("attractionOptions", option)} label={option} />)}</div>
      <Field label="Własny pomysł na atrakcje"><textarea rows={4} maxLength={2000} value={values.attractionNotes} onChange={(event) => update("attractionNotes", event.target.value)} /></Field>
      <Field label="Dodatkowe życzenia" hint="Zobaczymy, co da się zrobić!"><textarea rows={5} maxLength={2000} value={values.wishes} onChange={(event) => update("wishes", event.target.value)} /></Field>
    </FormSection>

    <FormSection number="07" title="Jak się z Wami skontaktować?">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię i nazwisko"><input required maxLength={120} autoComplete="name" value={values.contactName} onChange={(event) => update("contactName", event.target.value)} /></Field>
        <Field label="Firma (opcjonalnie)"><input maxLength={120} autoComplete="organization" value={values.company} onChange={(event) => update("company", event.target.value)} /></Field>
        <Field label="Telefon"><input required type="tel" autoComplete="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
        <Field label="E-mail"><input required type="email" autoComplete="email" value={values.email} onChange={(event) => update("email", event.target.value)} /></Field>
      </div>
      <label className="mt-5 flex gap-3 border border-white/15 p-4 text-sm leading-6"><input required type="checkbox" checked={values.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} className="mt-1 size-5 shrink-0 accent-orange-500" /> Wyrażam zgodę na kontakt i przetwarzanie podanych danych w celu obsługi tego zapytania.</label>
    </FormSection>

    {error ? <p className="border border-red-500/40 bg-red-500/10 p-4 text-red-100" role="alert">{error}</p> : null}
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={() => { if (window.confirm("Wyczyścić cały formularz?")) setValues(emptyValues()); }}><RotateCcw className="size-4" /> Wyczyść</Button>
      <Button type="submit" size="lg" disabled={working}>{working ? "Wysyłam…" : <><Send className="size-4" /> Wyślij niezobowiązujące zapytanie</>}</Button>
    </div>
  </form>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description?: string; children: React.ReactNode }) {
  return <section className="border-t border-white/15 pt-7"><div className="mb-6 grid gap-2 sm:grid-cols-[4rem_1fr]"><span className="font-mono text-sm text-orange-400">{number}</span><div><h2 className="font-display text-3xl font-black uppercase sm:text-5xl">{title}</h2>{description ? <p className="mt-2 max-w-3xl leading-7 text-white/55">{description}</p> : null}</div></div><div className="sm:pl-[4rem]">{children}</div></section>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="editor-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

function Choice({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <label className={`flex min-h-14 cursor-pointer items-center gap-3 border p-4 font-bold transition-colors ${checked ? "border-orange-500 bg-orange-500 text-black" : "border-white/15 hover:border-white/40"}`}><input type="checkbox" checked={checked} onChange={onChange} className="size-5 shrink-0 accent-neutral-950" /><span>{label}</span></label>;
}
