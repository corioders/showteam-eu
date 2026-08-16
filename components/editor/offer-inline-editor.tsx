"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ExternalLink, FilePlus2, LoaderCircle, MapPin, Plus, RotateCcw, Save, Settings2, Trash2 } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatOfferDateRange, type OfferDate } from "@/lib/offer-dates";
import { restoreOfferDraft, toOfferDraft, type OfferDraft } from "@/lib/offer-draft";
import type { Offer, OfferCategory } from "@/lib/offers";
import { createPhotoVariants } from "@/lib/client-image-variants";

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
  updateSection: (index: number, field: "title" | "body", value: string) => void;
  addSection: () => void;
  removeSection: (index: number) => void;
  updatePageContent: (field: string, value: string) => void;
};

const OfferEditingContext = createContext<OfferEditing | null>(null);

export function useOfferEditor() {
  return useContext(OfferEditingContext);
}

export function OfferInlineEditor({ offer, children }: { offer: Offer; children: React.ReactNode }) {
  const { enabled, visible } = useEditor();
  const router = useRouter();
  const initial = useMemo(() => toOfferDraft(offer), [offer]);
  const [value, setValue] = useState(initial);
  const valueRef = useRef(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [changingPage, setChangingPage] = useState(false);
  const editing = enabled && visible && Boolean(offer.cmsId);
  const draftKey = `showteam:visual-offer:${offer.cmsId}`;

  useEffect(() => {
    if (!editing) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    const restored = restoreOfferDraft(saved, initial);
    if (restored) {
      valueRef.current = restored;
      queueMicrotask(() => setValue(restored));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, editing, initial]);

  function persist(change: (current: OfferDraft) => OfferDraft) {
    const next = change(valueRef.current);
    valueRef.current = next;
    setValue(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
    setMessage(null);
    setErrors([]);
  }

  function update<K extends keyof OfferDraft>(field: K, nextValue: OfferDraft[K]) {
    persist((current) => ({ ...current, [field]: nextValue }));
  }

  function updateDate(index: number, field: keyof OfferDate, nextValue: string) {
    persist((current) => ({ ...current, dates: current.dates.map((date, itemIndex) => itemIndex === index ? { ...date, [field]: nextValue } : date) }));
  }

  function addDate() {
    persist((current) => ({ ...current, dates: [...current.dates, { label: "", startDate: "", endDate: "" }] }));
  }

  function removeDate(index: number) {
    persist((current) => ({ ...current, dates: current.dates.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateHighlight(index: number, nextValue: string) {
    persist((current) => ({ ...current, highlights: current.highlights.map((highlight, itemIndex) => itemIndex === index ? nextValue : highlight) }));
  }

  function addHighlight() {
    persist((current) => ({ ...current, highlights: [...current.highlights, ""] }));
  }

  function removeHighlight(index: number) {
    persist((current) => ({ ...current, highlights: current.highlights.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateSection(index: number, field: "title" | "body", nextValue: string) {
    persist((current) => ({ ...current, sections: current.sections.map((section, itemIndex) => itemIndex === index ? { ...section, [field]: nextValue } : section) }));
  }

  function addSection() {
    persist((current) => ({ ...current, sections: [...current.sections, { title: "", body: "" }] }));
  }

  function removeSection(index: number) {
    persist((current) => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updatePageContent(field: string, nextValue: string) {
    persist((current) => ({ ...current, pageContent: { ...current.pageContent, [field]: nextValue } }));
  }

  function clear() {
    localStorage.removeItem(draftKey);
    valueRef.current = initial;
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
      body: JSON.stringify(valueRef.current),
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

  async function createOffer() {
    setChangingPage(true);
    const response = await fetch("/api/admin/offers", { method: "POST" });
    const result = await response.json() as { href?: string; message?: string };
    setChangingPage(false);
    if (!response.ok || !result.href) {
      setErrors([result.message || "Nie udało się utworzyć nowej oferty."]);
      return;
    }
    router.push(result.href);
  }

  async function deleteOffer() {
    if (!offer.cmsId || !window.confirm(`Usunąć stronę „${value.title}”? Tej operacji nie można cofnąć.`)) return;
    setChangingPage(true);
    const response = await fetch(`/api/admin/offers/${offer.cmsId}`, { method: "DELETE" });
    const result = await response.json() as { message?: string };
    setChangingPage(false);
    if (!response.ok) {
      setErrors([result.message || "Nie udało się usunąć oferty."]);
      return;
    }
    localStorage.removeItem(draftKey);
    router.push("/");
    router.refresh();
  }

  const context: OfferEditing = { editing, value, update, updateDate, addDate, removeDate, updateHighlight, addHighlight, removeHighlight, updateSection, addSection, removeSection, updatePageContent };

  return (
    <OfferEditingContext.Provider value={context}>
      {editing && (
        <aside className="sticky top-20 z-[60] border-y border-orange-500/40 bg-neutral-950/95 px-3 py-2 shadow-2xl backdrop-blur" aria-label="Zapisywanie oferty">
          <div className="site-container flex flex-wrap items-center gap-2">
            <p className="mr-auto text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Edytujesz tę stronę</p>
            {(message || errors.length > 0) && <p className={`w-full text-sm sm:order-none sm:w-auto ${errors.length ? "text-red-300" : "text-emerald-300"}`} role="status">{errors[0] ?? message}</p>}
            <Button type="button" variant="ghost" size="sm" onClick={clear}><RotateCcw className="size-4" /> Cofnij zmiany</Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Zapisuję…" : "Zapisz zmiany"}</Button>
            <details className="inline-editor-settings w-full border-t border-white/10 pt-2">
              <summary className="flex cursor-pointer items-center gap-2 py-2 text-xs font-bold uppercase tracking-wider text-white/70"><Settings2 className="size-4" /> Ustawienia strony</summary>
              <div className="grid gap-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
                <label><span>Adres po /oferta/</span><input className="inline-editor-list-input" value={value.slug} onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/\s+/g, "-"))} /></label>
                <label><span>Link do mapy</span><input type="url" className="inline-editor-list-input" value={value.mapUrl} onChange={(event) => update("mapUrl", event.target.value)} /></label>
                <label><span>Kolejność</span><input type="number" min="0" max="999" className="inline-editor-list-input" value={value.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></label>
                <label className="flex min-h-12 items-center gap-3 pt-5"><input type="checkbox" checked={value.published} onChange={(event) => update("published", event.target.checked)} /><span>{value.published ? "Oferta widoczna" : "Oferta ukryta"}</span></label>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3"><Button type="button" variant="outline" size="sm" disabled={changingPage} onClick={() => void createOffer()}><FilePlus2 className="size-4" /> Dodaj nową ofertę</Button><Button type="button" variant="ghost" size="sm" disabled={changingPage} className="text-red-300 hover:bg-red-950 hover:text-red-100" onClick={() => void deleteOffer()}><Trash2 className="size-4" /> Usuń tę ofertę</Button></div>
            </details>
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
          {editing ? <><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/55">Nazwa terminu</span><input className="inline-editor-list-input" value={date.label} maxLength={80} placeholder="np. Turnus I" onChange={(event) => editor?.updateDate(index, "label", event.target.value)} /></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/55">Od</span><input type="date" className="inline-editor-list-input" value={date.startDate} onInput={(event) => editor?.updateDate(index, "startDate", event.currentTarget.value)} /></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/55">Do</span><input type="date" min={date.startDate || undefined} className="inline-editor-list-input" value={date.endDate} onInput={(event) => editor?.updateDate(index, "endDate", event.currentTarget.value)} /></label></div><button type="button" className="inline-editor-remove mt-5" onClick={() => editor?.removeDate(index)} aria-label={`Usuń termin ${index + 1}`}><Trash2 className="size-4" /></button></> : <><span className="font-semibold">{date.label}</span><span className={variant === "summer" ? "text-right text-sm text-white/50" : "ml-auto text-right text-sm text-white/55"}>{formatOfferDateRange(date)}</span></>}
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

export function OfferSectionList({ offer }: { offer: Offer }) {
  const editor = useContext(OfferEditingContext);
  const sections = editor?.value.sections ?? offer.sections;
  const editing = editor?.editing ?? false;
  if (!editing && sections.length === 0) return null;
  return <div className="grid gap-3">
    {sections.map((section, index) => <article key={index} className="border border-white/15 p-4">
      {editing ? <div className="grid gap-3"><label><span className="mb-1 block text-xs font-bold uppercase text-white/55">Nagłówek</span><input className="inline-editor-list-input" value={section.title} maxLength={120} onChange={(event) => editor?.updateSection(index, "title", event.target.value)} /></label><label><span className="mb-1 block text-xs font-bold uppercase text-white/55">Treść</span><textarea rows={5} className="inline-editor-list-input" value={section.body} maxLength={2000} onChange={(event) => editor?.updateSection(index, "body", event.target.value)} /></label><button type="button" className="inline-editor-remove" onClick={() => editor?.removeSection(index)} aria-label={`Usuń sekcję ${index + 1}`}><Trash2 className="size-4" /></button></div> : <><h3 className="font-display text-2xl font-black uppercase">{section.title}</h3><p className="mt-3 whitespace-pre-line leading-7 text-white/60">{section.body}</p></>}
    </article>)}
    {editing ? <button type="button" className="inline-editor-add border border-dashed border-orange-400/60" onClick={() => editor?.addSection()}><Plus className="size-4" /> Dodaj sekcję</button> : null}
  </div>;
}

export function OfferText({ field, fallback, multiline = false }: { field: string; fallback: string; multiline?: boolean }) {
  const editor = useContext(OfferEditingContext);
  const value = editor?.value.pageContent[field] ?? fallback;
  if (!editor?.editing) return <>{value}</>;
  const props = { value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => editor.updatePageContent(field, event.target.value), onClick: (event: React.MouseEvent) => event.stopPropagation(), onKeyDown: (event: React.KeyboardEvent) => event.stopPropagation(), className: "inline-page-content", "aria-label": `Edytuj: ${fallback.slice(0, 40)}` };
  return multiline ? <textarea {...props} rows={3} /> : <input {...props} />;
}

export function OfferLocationLink({ label }: { label?: string }) {
  const editor = useContext(OfferEditingContext);
  if (!editor) return null;
  return <section className="border-b border-white/10 bg-white/[.025]" aria-label="Dojazd"><div className="site-container flex flex-col gap-3 py-5 sm:flex-row sm:items-center"><span className="eyebrow">Dojazd</span><a href={editor.value.mapUrl} target="_blank" rel="noreferrer" className="group flex min-h-12 flex-1 items-center gap-3 border border-white/15 px-4 text-sm font-bold transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"><MapPin className="size-5 shrink-0 text-orange-500 group-hover:text-black" /><span>{label ?? editor.value.location}</span><ExternalLink className="ml-auto size-4 opacity-50" /></a>{editor.editing ? <label className="min-w-0 flex-1"><span className="mb-1 block text-xs font-bold uppercase text-white/55">Link do mapy</span><input type="url" className="inline-editor-list-input" value={editor.value.mapUrl} onChange={(event) => editor.update("mapUrl", event.target.value)} /></label> : null}</div></section>;
}

export function OfferAdditionalLocation({ label, field, fallback }: { label: string; field: string; fallback: string }) {
  const editor = useContext(OfferEditingContext);
  if (!editor) return null;
  const href = editor.value.pageContent[field] ?? fallback;
  return <section className="border-b border-white/10 bg-white/[.025]" aria-label="Dodatkowy dojazd"><div className="site-container flex flex-col gap-3 py-5 sm:flex-row sm:items-center"><a href={href} target="_blank" rel="noreferrer" className="group flex min-h-12 flex-1 items-center gap-3 border border-white/15 px-4 text-sm font-bold transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"><MapPin className="size-5 shrink-0 text-orange-500 group-hover:text-black" /><span>{label}</span><ExternalLink className="ml-auto size-4 opacity-50" /></a>{editor.editing ? <label className="min-w-0 flex-1"><span className="mb-1 block text-xs font-bold uppercase text-white/55">Link do mapy: {label}</span><input type="url" className="inline-editor-list-input" value={href} onChange={(event) => editor.updatePageContent(field, event.target.value)} /></label> : null}</div></section>;
}

export function OfferCtaTitle() {
  const editor = useContext(OfferEditingContext);
  if (!editor) return null;
  if (!editor.editing) return <>{editor.value.ctaTitle}</>;
  return <textarea rows={2} className="inline-page-content" value={editor.value.ctaTitle} onChange={(event) => editor.update("ctaTitle", event.target.value)} aria-label="Hasło nad przyciskiem zgłoszenia" />;
}

export function OfferCover({ offer }: { offer: Offer }) {
  const editor = useContext(OfferEditingContext);
  const [preview, setPreview] = useState(offer.image);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | undefined) {
    if (!file || !offer.cmsId || uploading) return;
    setUploading(true);
    setError("");
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    try {
      const variants = await createPhotoVariants(file);
      const body = new FormData();
      body.set("file", variants.large);
      const response = await fetch(`/api/admin/offers/${offer.cmsId}/cover`, { method: "POST", body });
      const result = await response.json() as { url?: string; message?: string };
      if (!response.ok || !result.url) throw new Error(result.message || "Nie udało się zmienić zdjęcia.");
      setPreview(result.url);
    } catch (caught) {
      setPreview(offer.image);
      setError(caught instanceof Error ? caught.message : "Nie udało się zmienić zdjęcia.");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  }

  return <>
    <Image src={preview} alt={offer.imageAlt} fill priority unoptimized={preview.startsWith("blob:")} className="object-cover" sizes="100vw" />
    {editor?.editing ? <div className="absolute right-4 top-24 z-20 max-w-[min(20rem,calc(100%-2rem))]"><label className="flex min-h-12 cursor-pointer items-center justify-center bg-orange-500 px-4 text-sm font-black uppercase text-black shadow-xl"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} />{uploading ? "Przygotowuję zdjęcie…" : "Zmień zdjęcie okładkowe"}</label>{error ? <p role="alert" className="mt-2 bg-red-950 p-3 text-sm text-red-100">{error}</p> : null}</div> : null}
  </>;
}

export function OfferMediaUpload({ offer, field, label = "Zmień zdjęcie" }: { offer: Offer; field: string; label?: string }) {
  const editor = useContext(OfferEditingContext);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  if (!editor?.editing || !offer.cmsId) return null;

  async function upload(file: File | undefined) {
    if (!file || !offer.cmsId || uploading) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("field", field);
      body.set("file", (await createPhotoVariants(file)).large);
      const response = await fetch(`/api/admin/offers/${offer.cmsId}/media`, { method: "POST", body });
      const result = await response.json() as { url?: string; message?: string };
      if (!response.ok || !result.url) throw new Error(result.message || "Nie udało się zmienić zdjęcia.");
      editor?.updatePageContent(field, result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zmienić zdjęcia.");
    } finally {
      setUploading(false);
    }
  }

  return <div className="absolute right-3 top-3 z-20 max-w-[calc(100%-1.5rem)]"><label className="flex min-h-10 cursor-pointer items-center bg-orange-500 px-3 text-xs font-black uppercase text-black shadow-xl"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} />{uploading ? "Wysyłam…" : label}</label>{error ? <p role="alert" className="mt-2 bg-red-950 p-2 text-xs text-red-100">{error}</p> : null}</div>;
}

export function OfferListsSection({ offer }: { offer: Offer }) {
  const editor = useContext(OfferEditingContext);
  const editing = editor?.editing ?? false;
  if (!editing && offer.dates.length === 0 && offer.highlights.length === 0) return null;

  return <section className="py-20 md:py-28"><div className="site-container grid gap-12 lg:grid-cols-2"><div><span className="eyebrow">Terminy</span><div className="mt-5"><OfferDateList offer={offer} /></div></div><div><span className="eyebrow">Najważniejsze</span><div className="mt-5"><OfferHighlightList offer={offer} /></div></div></div></section>;
}
