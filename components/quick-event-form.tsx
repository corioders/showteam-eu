"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminSessionGate } from "@/components/admin-session-gate";

type Field = "title" | "startDate" | "endDate" | "location" | "summary" | "category" | "image";
type Errors = Partial<Record<Field, string>>;
type PreviewData = { title: string; startDate: string; endDate: string; location: string; summary: string; category: string };
const categories = ["Lato", "Zima", "Szkolenia", "Inne"] as const;
const emptyPreview: PreviewData = { title: "Nazwa wydarzenia", startDate: "", endDate: "", location: "Miejsce wydarzenia", summary: "Tutaj pojawi się opis wpisywany w formularzu.", category: "Lato" };

export function QuickEventForm() {
  return <AdminSessionGate redirectPath="/a/dodaj/wydarzenie">{(userName) => <EventForm userName={userName} />}</AdminSessionGate>;
}

function EventForm({ userName }: { userName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const imagePreview = useMemo(() => image ? URL.createObjectURL(image) : "", [image]);
  const [previewData, setPreviewData] = useState<PreviewData>(emptyPreview);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  function updatePreview(form: HTMLFormElement) {
    const data = new FormData(form);
    setPreviewData({
      title: String(data.get("title") || "") || emptyPreview.title,
      startDate: String(data.get("startDate") || ""),
      endDate: String(data.get("endDate") || ""),
      location: String(data.get("location") || "") || emptyPreview.location,
      summary: String(data.get("summary") || "") || emptyPreview.summary,
      category: String(data.get("category") || "Lato"),
    });
  }

  function validate(form: FormData): Errors {
    const next: Errors = {};
    const start = String(form.get("startDate") || "");
    const end = String(form.get("endDate") || "");
    if (String(form.get("title") || "").trim().length < 2) next.title = "Wpisz nazwę wydarzenia.";
    if (!start) next.startDate = "Wybierz datę rozpoczęcia.";
    if (end && end < start) next.endDate = "Zakończenie nie może być przed rozpoczęciem.";
    if (String(form.get("location") || "").trim().length < 2) next.location = "Wpisz miejsce wydarzenia.";
    if (String(form.get("summary") || "").trim().length < 10) next.summary = "Napisz krótki opis — minimum 10 znaków.";
    if (!image) next.image = "Dodaj zdjęcie tego wydarzenia.";
    return next;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;
    const form = new FormData(event.currentTarget);
    if (image) form.set("image", image);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus("error");
      setMessage("Popraw zaznaczone pola.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setStatus("saving");
    setMessage("Zapisuję wydarzenie…");
    const response = await fetch("/api/quick-event", { method: "POST", body: form });
    const body = await response.json() as { error?: string; field?: Field };
    if (!response.ok) {
      if (body.field) setErrors({ [body.field]: body.error || "Popraw to pole." });
      setStatus("error");
      setMessage(body.error || "Nie udało się zapisać wydarzenia.");
      return;
    }
    event.currentTarget.reset();
    setImage(null);
    setPreviewData(emptyPreview);
    setErrors({});
    setStatus("done");
    setMessage("Wydarzenie jest już widoczne na stronie.");
  }

  function clearForm() {
    if (!window.confirm("Wyczyścić cały formularz wydarzenia?")) return;
    formRef.current?.reset();
    if (fileRef.current) fileRef.current.value = "";
    setImage(null);
    setPreviewData(emptyPreview);
    setErrors({});
    setStatus("idle");
    setMessage("");
  }

  const fieldClass = (field: Field) => `mt-2 w-full border bg-white/5 px-4 py-3 text-base text-white outline-none ${errors[field] ? "border-red-500" : "border-white/20 focus:border-orange-500"}`;
  const error = (field: Field) => errors[field] ? <span className="mt-2 block text-sm font-semibold text-red-300">{errors[field]}</span> : null;

  return <main className="min-h-dvh bg-[#080a0b] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/15 pb-4"><div><p className="font-display text-xl font-black uppercase">SHOWteam<span className="text-orange-500">.</span></p><p className="text-xs text-white/45">Zalogowano: {userName}</p></div><div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center"><Link href="/admin/collections/events" className="text-xs text-white/40 underline">Zaawansowane</Link><Link href="/admin" className="bg-orange-500 px-3 py-2 text-xs font-black uppercase text-black">← Wróć do panelu</Link></div></header>
      <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-orange-400">Szybka akcja</p>
      <h1 className="font-display mt-3 text-5xl font-black uppercase leading-[.9]">Dodaj wydarzenie.</h1>
      <p className="mt-4 text-sm leading-6 text-white/55">Wszystko na jednym ekranie. Po zapisaniu wydarzenie od razu pojawi się na stronie.</p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.82fr)]">
      <form ref={formRef} onInput={(event) => updatePreview(event.currentTarget)} onSubmit={(event) => void submit(event)} noValidate className="space-y-6">
        <label data-error={Boolean(errors.title)} className="block font-bold">Nazwa wydarzenia<input name="title" maxLength={120} className={fieldClass("title")} placeholder="np. SHOWCamp — Turnus I" />{error("title")}</label>
        <div className="grid gap-4 sm:grid-cols-2"><label data-error={Boolean(errors.startDate)} className="block font-bold">Data rozpoczęcia<input name="startDate" type="date" className={fieldClass("startDate")} />{error("startDate")}</label><label data-error={Boolean(errors.endDate)} className="block font-bold">Data zakończenia <span className="font-normal text-white/35">(opcjonalnie)</span><input name="endDate" type="date" className={fieldClass("endDate")} />{error("endDate")}</label></div>
        <label data-error={Boolean(errors.location)} className="block font-bold">Miejsce<input name="location" maxLength={160} className={fieldClass("location")} placeholder="np. Wake & Surf Village · Poręba" />{error("location")}</label>
        <label data-error={Boolean(errors.summary)} className="block font-bold">Opis dla klienta<textarea name="summary" rows={5} maxLength={400} className={fieldClass("summary")} placeholder="Co się będzie działo i dla kogo jest to wydarzenie?" />{error("summary")}</label>
        <fieldset><legend className="mb-3 font-bold">Kategoria</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map((category) => <label key={category} className="cursor-pointer"><input className="peer sr-only" type="radio" name="category" value={category} defaultChecked={category === "Lato"} /><span className="block border border-white/20 px-3 py-3 text-center text-sm peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-black">{category}</span></label>)}</div></fieldset>
        <div data-error={Boolean(errors.image)}><span className="block font-bold">Zdjęcie wydarzenia</span><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { setImage(event.target.files?.[0] || null); setErrors((current) => ({ ...current, image: undefined })); }} />
          {imagePreview ? <div className="relative mt-2 aspect-video overflow-hidden border border-white/20"><Image src={imagePreview} alt="Podgląd zdjęcia wydarzenia" fill unoptimized className="object-cover" /><button type="button" aria-label="Usuń zdjęcie" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/85"><X className="size-5" /></button></div> : <button type="button" onClick={() => fileRef.current?.click()} className={`mt-2 flex min-h-36 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-5 ${errors.image ? "border-red-500 bg-red-500/10" : "border-orange-500/60 bg-orange-500/10"}`}><ImagePlus className="size-8 text-orange-400" /><strong>Wybierz zdjęcie</strong><span className="text-xs text-white/40">JPG, PNG, WebP lub AVIF · maks. 15 MB</span></button>}{error("image")}
        </div>
        {message ? <p role={status === "error" ? "alert" : "status"} className={`border-l-2 py-2 pl-3 text-sm ${status === "error" ? "border-red-500 text-red-300" : "border-green-500 text-green-300"}`}>{status === "done" ? <CheckCircle2 className="mr-2 inline size-5" /> : null}{message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button type="submit" disabled={status === "saving"} className="flex w-full items-center justify-center gap-2 bg-orange-500 px-5 py-4 font-black uppercase text-black disabled:opacity-50">{status === "saving" ? <LoaderCircle className="size-5 animate-spin" /> : <CalendarPlus className="size-5" />}{status === "saving" ? "Zapisuję…" : "Opublikuj wydarzenie"}</button>
          <button type="button" onClick={clearForm} disabled={status === "saving"} className="border border-white/25 px-5 py-4 font-bold text-white/70 disabled:opacity-50">Wyczyść formularz</button>
        </div>
      </form>
      <aside aria-label="Podgląd wydarzenia" className="lg:sticky lg:top-6">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[.18em] text-white/45">Podgląd na stronie</p>
        <div className="overflow-hidden border border-white/20 bg-black">
          <div className="relative aspect-[4/3] bg-white/5">
            {imagePreview ? <Image src={imagePreview} alt="" fill unoptimized className="object-cover" /> : <div className="grid size-full place-items-center text-center text-sm text-white/35">Wybrane zdjęcie<br />pojawi się tutaj</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <span className="absolute left-4 top-4 bg-orange-500 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-black">{previewData.category}</span>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-400">{formatPreviewDates(previewData.startDate, previewData.endDate)}</p>
            <h2 className="font-display mt-3 text-4xl font-black uppercase leading-[.92]">{previewData.title}</h2>
            <p className="mt-3 text-sm font-semibold text-white/65">{previewData.location}</p>
            <p className="mt-5 whitespace-pre-line text-sm leading-6 text-white/55">{previewData.summary}</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-white/35">To przybliżony wygląd karty wydarzenia.</p>
      </aside>
      </div>
    </div>
  </main>;
}

function formatPreviewDates(start: string, end: string) {
  if (!start) return "Termin pojawi się tutaj";
  const format = (value: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  return end && end !== start ? `${format(start)} – ${format(end)}` : format(start);
}
