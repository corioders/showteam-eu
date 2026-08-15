"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatOfferDateRange, type OfferDate } from "@/lib/offer-dates";
import { restoreOfferDraft, toOfferDraft, type OfferDraft } from "@/lib/offer-draft";
import type { Offer, OfferCategory } from "@/lib/offers";

type OfferEditing = {
  editing: boolean;
  value: OfferDraft;
  update: <K extends keyof OfferDraft>(field: K, value: OfferDraft[K]) => void;
  updateDate: (index: number, field: keyof OfferDate, value: string) => void;
  addDate: () => void;
  removeDate: (index: number) => void;
  updateHighlight: (index: number, value: string) => void;
  addHighlight: () => void;
  removeHighlight: (index: number) => void;
};

const OfferEditingContext = createContext<OfferEditing | null>(null);

export function OfferInlineEditor({ offer, children }: { offer: Offer; children: React.ReactNode }) {
  const { enabled, visible } = useEditor();
  const router = useRouter();
  const initial = useMemo(() => toOfferDraft(offer), [offer]);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const editing = enabled && visible && Boolean(offer.cmsId);
  const draftKey = `showteam:visual-offer:${offer.cmsId}`;

  useEffect(() => {
    if (!editing) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    const restored = restoreOfferDraft(saved, initial);
    if (restored) {
      queueMicrotask(() => setValue(restored));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, editing, initial]);

  function persist(next: OfferDraft) {
    setValue(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
    setMessage(null);
    setErrors([]);
  }

  function update<K extends keyof OfferDraft>(field: K, nextValue: OfferDraft[K]) {
    persist({ ...value, [field]: nextValue });
  }

  function updateDate(index: number, field: keyof OfferDate, nextValue: string) {
    const dates = value.dates.map((date, itemIndex) => itemIndex === index ? { ...date, [field]: nextValue } : date);
    persist({ ...value, dates });
  }

  function addDate() {
    persist({ ...value, dates: [...value.dates, { label: "", startDate: "", endDate: "" }] });
  }

  function removeDate(index: number) {
    persist({ ...value, dates: value.dates.filter((_, itemIndex) => itemIndex !== index) });
  }

  function updateHighlight(index: number, nextValue: string) {
    const highlights = value.highlights.map((highlight, itemIndex) => itemIndex === index ? nextValue : highlight);
    persist({ ...value, highlights });
  }

  function addHighlight() {
    persist({ ...value, highlights: [...value.highlights, ""] });
  }

  function removeHighlight(index: number) {
    persist({ ...value, highlights: value.highlights.filter((_, itemIndex) => itemIndex !== index) });
  }

  function clear() {
    localStorage.removeItem(draftKey);
    setValue(initial);
    setMessage(null);
    setErrors([]);
  }

  async function save() {
    if (!offer.cmsId) return;
    setSaving(true);
    setMessage(null);
    setErrors([]);
    const response = await fetch(`/api/admin/offers/${offer.cmsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const result = await response.json() as { message?: string; errors?: string[] };
    setSaving(false);
    setMessage(result.message ?? null);
    setErrors(result.errors ?? []);
    if (response.ok) {
      localStorage.removeItem(draftKey);
      router.refresh();
    }
  }

  const context: OfferEditing = { editing, value, update, updateDate, addDate, removeDate, updateHighlight, addHighlight, removeHighlight };

  return (
    <OfferEditingContext.Provider value={context}>
      {editing && (
        <aside className="sticky top-20 z-[60] border-y border-orange-500/40 bg-neutral-950/95 px-3 py-2 shadow-2xl backdrop-blur" aria-label="Zapisywanie oferty">
          <div className="site-container flex flex-wrap items-center gap-2">
            <p className="mr-auto text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Edytujesz tę stronę</p>
            {(message || errors.length > 0) && <p className={`w-full text-sm sm:order-none sm:w-auto ${errors.length ? "text-red-300" : "text-emerald-300"}`} role="status">{errors[0] ?? message}</p>}
            <Button type="button" variant="ghost" size="sm" onClick={clear}><RotateCcw className="size-4" /> Cofnij zmiany</Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Zapisuję…" : "Zapisz zmiany"}</Button>
          </div>
        </aside>
      )}
      {children}
    </OfferEditingContext.Provider>
  );
}

export function OfferHeroFields({ offer }: { offer: Offer }) {
  const editor = useContext(OfferEditingContext);
  const value = editor?.value ?? toOfferDraft(offer);
  const editing = editor?.editing ?? false;

  return (
    <>
      {editing ? (
        <div className="inline-editor-badge">
          <label><span className="sr-only">Kategoria</span><select value={value.category} onChange={(event) => editor?.update("category", event.target.value as OfferCategory)}>{["Lato", "Zima", "Szkolenia", "Noclegi"].map((category) => <option key={category}>{category}</option>)}</select></label>
          <span aria-hidden="true">·</span>
          <label><span className="sr-only">Nazwa sezonu</span><input value={value.season} maxLength={80} onChange={(event) => editor?.update("season", event.target.value)} /></label>
        </div>
      ) : <Badge>{value.category} · {value.season}</Badge>}

      {editing ? (
        <label className="block"><span className="sr-only">Nazwa oferty</span><textarea className="inline-editor-title" rows={1} required maxLength={120} value={value.title} onChange={(event) => editor?.update("title", event.target.value)} /></label>
      ) : <h1 className="font-display mt-6 text-[clamp(4.2rem,13vw,10rem)] font-black uppercase leading-[0.79] tracking-[-0.055em]">{value.title}</h1>}

      <div className="mt-8 grid max-w-3xl gap-5 border-l-2 border-orange-500 pl-5 sm:grid-cols-[1fr_auto] sm:items-end">
        {editing ? <label><span className="sr-only">Krótki opis</span><textarea className="inline-editor-copy" rows={4} required minLength={10} maxLength={360} value={value.summary} onChange={(event) => editor?.update("summary", event.target.value)} /></label> : <p className="text-base leading-7 text-white/70 sm:text-lg">{value.summary}</p>}
        {editing ? <label><span className="sr-only">Lokalizacja</span><input className="inline-editor-location" required maxLength={160} value={value.location} onChange={(event) => editor?.update("location", event.target.value)} /></label> : <p className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">{value.location}</p>}
      </div>
    </>
  );
}

export function OfferDateList({ offer, variant = "generic" }: { offer: Offer; variant?: "generic" | "summer" | "winter" }) {
  const editor = useContext(OfferEditingContext);
  const dates = editor?.value.dates ?? offer.dates;
  const editing = editor?.editing ?? false;
  const container = variant === "summer" ? "poster-cut overflow-hidden border border-white/10" : variant === "winter" ? "grid border-l border-t border-white/15 sm:grid-cols-2" : "border border-white/15";

  return (
    <div className={container}>
      {dates.map((date, index) => {
        const rowClass = editing ? "flex items-start gap-3 border-b border-r border-white/15 p-4" : variant === "summer" ? "grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-white/10 px-5 py-6 last:border-0 sm:grid-cols-[4rem_1fr_auto] sm:px-8" : variant === "winter" ? "flex min-h-24 items-center gap-4 border-b border-r border-white/15 p-5" : "flex items-center gap-3 border-b border-white/10 p-4 last:border-0";
        return <div key={index} className={rowClass}>
          {!editing && variant !== "generic" && <span className="font-display text-3xl font-black text-orange-500">{String(index + 1).padStart(2, "0")}</span>}
          {editing ? <><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/55">Nazwa terminu</span><input className="inline-editor-list-input" value={date.label} maxLength={80} placeholder="np. Turnus I" onChange={(event) => editor?.updateDate(index, "label", event.target.value)} /></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/55">Od</span><input type="date" className="inline-editor-list-input" value={date.startDate} onChange={(event) => editor?.updateDate(index, "startDate", event.target.value)} /></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/55">Do</span><input type="date" min={date.startDate || undefined} className="inline-editor-list-input" value={date.endDate} onChange={(event) => editor?.updateDate(index, "endDate", event.target.value)} /></label></div><button type="button" className="inline-editor-remove mt-5" onClick={() => editor?.removeDate(index)} aria-label={`Usuń termin ${index + 1}`}><Trash2 className="size-4" /></button></> : <><span className="font-semibold">{date.label}</span><span className={variant === "summer" ? "text-right text-sm text-white/50" : "ml-auto text-right text-sm text-white/55"}>{formatOfferDateRange(date)}</span></>}
        </div>;
      })}
      {editing && <button type="button" className="inline-editor-add" onClick={() => editor?.addDate()}><Plus className="size-4" /> Dodaj termin</button>}
    </div>
  );
}

export function OfferHighlightList({ offer }: { offer: Offer }) {
  const editor = useContext(OfferEditingContext);
  const highlights = editor?.value.highlights ?? offer.highlights;
  const editing = editor?.editing ?? false;

  return (
    <div className="border border-white/15">
      {highlights.map((highlight, index) => <div key={index} className="flex items-center gap-3 border-b border-white/10 p-4 last:border-0">{editing ? <><label className="min-w-0 flex-1"><span className="sr-only">Najważniejszy punkt {index + 1}</span><input className="inline-editor-list-input" value={highlight} maxLength={180} onChange={(event) => editor?.updateHighlight(index, event.target.value)} /></label><button type="button" className="inline-editor-remove" onClick={() => editor?.removeHighlight(index)} aria-label={`Usuń punkt ${index + 1}`}><Trash2 className="size-4" /></button></> : <p className="text-white/70">{highlight}</p>}</div>)}
      {editing && <button type="button" className="inline-editor-add" onClick={() => editor?.addHighlight()}><Plus className="size-4" /> Dodaj punkt</button>}
    </div>
  );
}

export function OfferListsSection({ offer }: { offer: Offer }) {
  const editor = useContext(OfferEditingContext);
  const editing = editor?.editing ?? false;
  if (!editing && offer.dates.length === 0 && offer.highlights.length === 0) return null;

  return <section className="py-20 md:py-28"><div className="site-container grid gap-12 lg:grid-cols-2"><div><span className="eyebrow">Terminy</span><div className="mt-5"><OfferDateList offer={offer} /></div></div><div><span className="eyebrow">Najważniejsze</span><div className="mt-5"><OfferHighlightList offer={offer} /></div></div></div></section>;
}
