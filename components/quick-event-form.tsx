"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminSessionGate } from "@/components/admin-session-gate";

type Field = "title" | "startDate" | "endDate" | "location" | "summary" | "category" | "image";
type Errors = Partial<Record<Field, string>>;
const categories = ["Lato", "Zima", "Szkolenia", "Inne"] as const;

export function QuickEventForm() {
  return <AdminSessionGate redirectPath="/a/dodaj/wydarzenie">{(userName) => <EventForm userName={userName} />}</AdminSessionGate>;
}

function EventForm({ userName }: { userName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : "", [image]);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

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
    setErrors({});
    setStatus("done");
    setMessage("Wydarzenie jest już widoczne na stronie.");
  }

  function clearForm() {
    if (!window.confirm("Wyczyścić cały formularz wydarzenia?")) return;
    formRef.current?.reset();
    if (fileRef.current) fileRef.current.value = "";
    setImage(null);
    setErrors({});
    setStatus("idle");
    setMessage("");
  }

  const fieldClass = (field: Field) => `mt-2 w-full border bg-white/5 px-4 py-3 text-base text-white outline-none ${errors[field] ? "border-red-500" : "border-white/20 focus:border-orange-500"}`;
  const error = (field: Field) => errors[field] ? <span className="mt-2 block text-sm font-semibold text-red-300">{errors[field]}</span> : null;

  return <main className="min-h-dvh bg-[#080a0b] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white">
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 flex items-center justify-between border-b border-white/15 pb-4"><div><p className="font-display text-xl font-black uppercase">SHOWteam<span className="text-orange-500">.</span></p><p className="text-xs text-white/45">Zalogowano: {userName}</p></div><div className="flex gap-4"><Link href="/admin/collections/events" className="text-xs text-white/40 underline">Zaawansowane</Link><Link href="/admin" className="text-sm font-bold underline">Panel</Link></div></header>
      <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-orange-400">Szybka akcja</p>
      <h1 className="font-display mt-3 text-5xl font-black uppercase leading-[.9]">Dodaj wydarzenie.</h1>
      <p className="mt-4 text-sm leading-6 text-white/55">Wszystko na jednym ekranie. Po zapisaniu wydarzenie od razu pojawi się na stronie.</p>

      <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate className="mt-8 space-y-6">
        <label data-error={Boolean(errors.title)} className="block font-bold">Nazwa wydarzenia<input name="title" maxLength={120} className={fieldClass("title")} placeholder="np. SHOWCamp — Turnus I" />{error("title")}</label>
        <div className="grid gap-4 sm:grid-cols-2"><label data-error={Boolean(errors.startDate)} className="block font-bold">Data rozpoczęcia<input name="startDate" type="date" className={fieldClass("startDate")} />{error("startDate")}</label><label data-error={Boolean(errors.endDate)} className="block font-bold">Data zakończenia <span className="font-normal text-white/35">(opcjonalnie)</span><input name="endDate" type="date" className={fieldClass("endDate")} />{error("endDate")}</label></div>
        <label data-error={Boolean(errors.location)} className="block font-bold">Miejsce<input name="location" maxLength={160} className={fieldClass("location")} placeholder="np. Wake & Surf Village · Poręba" />{error("location")}</label>
        <label data-error={Boolean(errors.summary)} className="block font-bold">Opis dla klienta<textarea name="summary" rows={5} maxLength={400} className={fieldClass("summary")} placeholder="Co się będzie działo i dla kogo jest to wydarzenie?" />{error("summary")}</label>
        <fieldset><legend className="mb-3 font-bold">Kategoria</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map((category) => <label key={category} className="cursor-pointer"><input className="peer sr-only" type="radio" name="category" value={category} defaultChecked={category === "Lato"} /><span className="block border border-white/20 px-3 py-3 text-center text-sm peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-black">{category}</span></label>)}</div></fieldset>
        <div data-error={Boolean(errors.image)}><span className="block font-bold">Zdjęcie wydarzenia</span><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { setImage(event.target.files?.[0] || null); setErrors((current) => ({ ...current, image: undefined })); }} />
          {preview ? <div className="relative mt-2 aspect-video overflow-hidden border border-white/20"><Image src={preview} alt="Podgląd zdjęcia wydarzenia" fill unoptimized className="object-cover" /><button type="button" aria-label="Usuń zdjęcie" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/85"><X className="size-5" /></button></div> : <button type="button" onClick={() => fileRef.current?.click()} className={`mt-2 flex min-h-36 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-5 ${errors.image ? "border-red-500 bg-red-500/10" : "border-orange-500/60 bg-orange-500/10"}`}><ImagePlus className="size-8 text-orange-400" /><strong>Wybierz zdjęcie</strong><span className="text-xs text-white/40">JPG, PNG, WebP lub AVIF · maks. 15 MB</span></button>}{error("image")}
        </div>
        {message ? <p role={status === "error" ? "alert" : "status"} className={`border-l-2 py-2 pl-3 text-sm ${status === "error" ? "border-red-500 text-red-300" : "border-green-500 text-green-300"}`}>{status === "done" ? <CheckCircle2 className="mr-2 inline size-5" /> : null}{message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button type="submit" disabled={status === "saving"} className="flex w-full items-center justify-center gap-2 bg-orange-500 px-5 py-4 font-black uppercase text-black disabled:opacity-50">{status === "saving" ? <LoaderCircle className="size-5 animate-spin" /> : <CalendarPlus className="size-5" />}{status === "saving" ? "Zapisuję…" : "Opublikuj wydarzenie"}</button>
          <button type="button" onClick={clearForm} disabled={status === "saving"} className="border border-white/25 px-5 py-4 font-bold text-white/70 disabled:opacity-50">Wyczyść formularz</button>
        </div>
      </form>
    </div>
  </main>;
}
