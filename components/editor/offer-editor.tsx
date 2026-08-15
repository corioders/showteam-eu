"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, RotateCcw, Save } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Offer, OfferCategory } from "@/lib/offers";
import { cn } from "@/lib/utils";

type FormValue = {
  title: string;
  category: OfferCategory;
  location: string;
  summary: string;
  season: string;
  dates: string;
  highlights: string;
  published: boolean;
};

export function OfferEditor({ offer, compact = false, className }: { offer: Offer; compact?: boolean; className?: string }) {
  const { enabled, visible } = useEditor();
  const router = useRouter();
  const initial = toFormValue(offer);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const draftKey = `showteam:visual-offer:${offer.cmsId}`;

  if (!enabled || !visible || !offer.cmsId) return null;

  function openChanged(open: boolean) {
    if (!open) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try { setValue(JSON.parse(saved) as FormValue); } catch { localStorage.removeItem(draftKey); }
  }

  function update<K extends keyof FormValue>(field: K, nextValue: FormValue[K]) {
    const next = { ...value, [field]: nextValue };
    setValue(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
    setMessage(null);
    setErrors([]);
  }

  function clear() {
    localStorage.removeItem(draftKey);
    setValue(initial);
    setMessage(null);
    setErrors([]);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors([]);
    const response = await fetch(`/api/admin/offers/${offer.cmsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...value, dates: lines(value.dates), highlights: lines(value.highlights) }),
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

  return (
    <Sheet onOpenChange={openChanged}>
      <SheetTrigger asChild>
        <button type="button" className={cn("editor-action", compact && "min-h-10 px-3", className)}><Pencil className="size-4" />{compact ? <span className="sr-only">Edytuj {offer.title}</span> : "Edytuj ofertę"}</button>
      </SheetTrigger>
      <SheetContent title={`Edytuj ${offer.title}`} description="Zmień treść oferty bez opuszczania strony." className="overflow-y-auto sm:left-auto sm:w-[min(38rem,100vw)]">
        <form onSubmit={save} className="min-h-full px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-8">
          <span className="eyebrow">Edytujesz na stronie</span>
          <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none">{offer.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">Zmień treść i opublikuj. Podgląd na dole pokazuje najważniejsze elementy.</p>

          <div className="mt-8 grid gap-5">
            <Field label="Nazwa oferty"><input required maxLength={120} value={value.title} onChange={(event) => update("title", event.target.value)} /></Field>
            <Field label="Kategoria"><select value={value.category} onChange={(event) => update("category", event.target.value as OfferCategory)}>{["Lato", "Zima", "Szkolenia", "Noclegi"].map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Nazwa sezonu"><input required maxLength={80} value={value.season} onChange={(event) => update("season", event.target.value)} /></Field>
            <Field label="Lokalizacja"><input required maxLength={160} value={value.location} onChange={(event) => update("location", event.target.value)} /></Field>
            <Field label="Krótki opis"><textarea required minLength={10} maxLength={360} rows={5} value={value.summary} onChange={(event) => update("summary", event.target.value)} /><small>{value.summary.length}/360</small></Field>
            <Field label="Terminy" hint="Jeden termin w każdej linii."><textarea rows={6} value={value.dates} onChange={(event) => update("dates", event.target.value)} /></Field>
            <Field label="Najważniejsze punkty" hint="Jeden punkt w każdej linii."><textarea rows={5} value={value.highlights} onChange={(event) => update("highlights", event.target.value)} /></Field>
            <label className="flex min-h-12 items-center gap-3 border border-white/15 p-3 font-semibold"><input type="checkbox" checked={value.published} onChange={(event) => update("published", event.target.checked)} className="size-5 accent-orange-500" /> Pokaż ofertę na stronie</label>
          </div>

          <div className="mt-8 border border-white/15 bg-white/[0.04] p-5" aria-label="Podgląd">
            <span className="eyebrow">Podgląd</span>
            <p className="mt-4 font-display text-4xl font-black uppercase leading-none">{value.title || "Nazwa oferty"}</p>
            <p className="mt-3 text-sm text-orange-300">{value.category} · {value.season}</p>
            <p className="mt-4 text-sm leading-6 text-white/60">{value.summary || "Tutaj pojawi się opis."}</p>
            <p className="mt-3 text-xs font-semibold text-white/45">{value.location}</p>
          </div>

          {(message || errors.length > 0) && <div className={`mt-6 border p-4 text-sm ${errors.length ? "border-red-400/50 bg-red-950/50 text-red-100" : "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"}`} role="status"><p className="font-bold">{message}</p>{errors.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>}

          <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-white/15 bg-neutral-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:left-auto sm:w-[min(38rem,100vw)] sm:px-8">
            <Button type="button" variant="outline" onClick={clear}><RotateCcw className="size-4" /> Wyczyść</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Zapisuję…" : "Zapisz i opublikuj"}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="editor-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function toFormValue(offer: Offer): FormValue {
  return { title: offer.title, category: offer.category, location: offer.location, summary: offer.summary, season: offer.season, dates: offer.dates.join("\n"), highlights: offer.highlights.join("\n"), published: true };
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}
