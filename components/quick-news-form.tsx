"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ImagePlus, LoaderCircle, Newspaper, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminSessionGate } from "@/components/admin-session-gate";

type Field = "title" | "publicationDate" | "summary" | "content" | "category" | "image";
type Errors = Partial<Record<Field, string>>;
const categories = ["Baza", "Wyjazdy", "Sport", "Inne"] as const;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });

export function QuickNewsForm() {
  return <AdminSessionGate redirectPath="/a/dodaj/aktualnosc">{(userName) => <NewsForm userName={userName} />}</AdminSessionGate>;
}

function NewsForm({ userName }: { userName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const imagePreview = useMemo(() => image ? URL.createObjectURL(image) : "", [image]);
  const [preview, setPreview] = useState({ title: "Tytuł aktualności", publicationDate: today(), summary: "Tutaj pojawi się krótki wstęp.", content: "Treść aktualności pojawi się w tym miejscu.", category: "Baza" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  function updatePreview(form: HTMLFormElement) {
    const data = new FormData(form);
    setPreview({
      title: String(data.get("title") || "") || "Tytuł aktualności",
      publicationDate: String(data.get("publicationDate") || "") || today(),
      summary: String(data.get("summary") || "") || "Tutaj pojawi się krótki wstęp.",
      content: String(data.get("content") || "") || "Treść aktualności pojawi się w tym miejscu.",
      category: String(data.get("category") || "Baza"),
    });
  }

  function validate(form: FormData): Errors {
    const next: Errors = {};
    if (String(form.get("title") || "").trim().length < 2) next.title = "Wpisz tytuł aktualności.";
    if (!String(form.get("publicationDate") || "")) next.publicationDate = "Wybierz datę publikacji.";
    if (String(form.get("summary") || "").trim().length < 10) next.summary = "Napisz krótki wstęp — minimum 10 znaków.";
    if (String(form.get("content") || "").trim().length < 20) next.content = "Napisz treść aktualności — minimum 20 znaków.";
    if (!image) next.image = "Dodaj zdjęcie tej aktualności.";
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
      setMessage("Uzupełnij zaznaczone pola.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setStatus("saving");
    setMessage("Publikuję aktualność…");
    const response = await fetch("/api/quick-news", { method: "POST", body: form });
    const body = await response.json() as { error?: string; field?: Field };
    if (!response.ok) {
      if (body.field) setErrors({ [body.field]: body.error || "Popraw to pole." });
      setStatus("error");
      setMessage(body.error || "Nie udało się opublikować aktualności.");
      return;
    }
    clear(false);
    setStatus("done");
    setMessage("Aktualność jest już widoczna na stronie.");
  }

  function clear(confirm = true) {
    if (confirm && !window.confirm("Wyczyścić cały formularz aktualności?")) return;
    formRef.current?.reset();
    if (fileRef.current) fileRef.current.value = "";
    setImage(null);
    setPreview({ title: "Tytuł aktualności", publicationDate: today(), summary: "Tutaj pojawi się krótki wstęp.", content: "Treść aktualności pojawi się w tym miejscu.", category: "Baza" });
    setErrors({});
    setStatus("idle");
    setMessage("");
  }

  const fieldClass = (field: Field) => `mt-2 w-full border bg-white/5 px-4 py-3 text-base text-white outline-none ${errors[field] ? "border-red-500" : "border-white/20 focus:border-orange-500"}`;
  const error = (field: Field) => errors[field] ? <span className="mt-2 block text-sm font-semibold text-red-300">{errors[field]}</span> : null;

  return <main className="min-h-dvh bg-[#080a0b] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/15 pb-4"><div><p className="font-display text-xl font-black uppercase">SHOWteam<span className="text-orange-500">.</span></p><p className="text-xs text-white/45">Zalogowano: {userName}</p></div><div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center"><Link href="/admin/collections/news" className="text-xs text-white/40 underline">Zaawansowane</Link><Link href="/admin" className="bg-orange-500 px-3 py-2 text-xs font-black uppercase text-black">← Wróć do panelu</Link></div></header>
    <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-orange-400">Szybka akcja</p><h1 className="font-display mt-3 text-5xl font-black uppercase leading-[.9]">Dodaj aktualność.</h1><p className="mt-4 text-sm leading-6 text-white/55">Wpisz wiadomość, dodaj zdjęcie i opublikuj.</p>
    <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.82fr)]">
      <form ref={formRef} onInput={(event) => updatePreview(event.currentTarget)} onSubmit={(event) => void submit(event)} noValidate className="space-y-6">
        <label data-error={Boolean(errors.title)} className="block font-bold">Tytuł<input name="title" maxLength={120} className={fieldClass("title")} placeholder="np. Nowy sprzęt już na bazie" />{error("title")}</label>
        <label data-error={Boolean(errors.publicationDate)} className="block font-bold">Data publikacji<input name="publicationDate" type="date" defaultValue={today()} className={fieldClass("publicationDate")} />{error("publicationDate")}</label>
        <label data-error={Boolean(errors.summary)} className="block font-bold">Krótki wstęp<textarea name="summary" rows={3} maxLength={300} className={fieldClass("summary")} />{error("summary")}</label>
        <label data-error={Boolean(errors.content)} className="block font-bold">Treść aktualności<textarea name="content" rows={8} maxLength={3000} className={fieldClass("content")} />{error("content")}</label>
        <fieldset><legend className="mb-3 font-bold">Kategoria</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map((category) => <label key={category} className="cursor-pointer"><input className="peer sr-only" type="radio" name="category" value={category} defaultChecked={category === "Baza"} /><span className="block border border-white/20 px-3 py-3 text-center text-sm peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-black">{category}</span></label>)}</div></fieldset>
        <div data-error={Boolean(errors.image)}><span className="block font-bold">Zdjęcie aktualności</span><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { setImage(event.target.files?.[0] || null); setErrors((current) => ({ ...current, image: undefined })); }} />
          {imagePreview ? <div className="relative mt-2 aspect-video overflow-hidden border border-white/20"><Image src={imagePreview} alt="Podgląd zdjęcia aktualności" fill unoptimized className="object-cover" /><button type="button" aria-label="Usuń zdjęcie" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/85"><X className="size-5" /></button></div> : <button type="button" onClick={() => fileRef.current?.click()} className={`mt-2 flex min-h-36 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-5 ${errors.image ? "border-red-500 bg-red-500/10" : "border-orange-500/60 bg-orange-500/10"}`}><ImagePlus className="size-8 text-orange-400" /><strong>Wybierz zdjęcie</strong><span className="text-xs text-white/40">JPG, PNG, WebP lub AVIF · maks. 15 MB</span></button>}{error("image")}
        </div>
        {message ? <p role={status === "error" ? "alert" : "status"} className={`border-l-2 py-2 pl-3 text-sm ${status === "error" ? "border-red-500 text-red-300" : "border-green-500 text-green-300"}`}>{status === "done" ? <CheckCircle2 className="mr-2 inline size-5" /> : null}{message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><button type="submit" disabled={status === "saving"} className="flex w-full items-center justify-center gap-2 bg-orange-500 px-5 py-4 font-black uppercase text-black disabled:opacity-50">{status === "saving" ? <LoaderCircle className="size-5 animate-spin" /> : <Newspaper className="size-5" />}{status === "saving" ? "Publikuję…" : "Opublikuj aktualność"}</button><button type="button" onClick={() => clear()} disabled={status === "saving"} className="border border-white/25 px-5 py-4 font-bold text-white/70 disabled:opacity-50">Wyczyść formularz</button></div>
      </form>
      <aside aria-label="Podgląd aktualności" className="lg:sticky lg:top-6"><p className="mb-3 font-mono text-xs font-bold uppercase tracking-[.18em] text-white/45">Podgląd na stronie</p><article className="overflow-hidden border border-white/20 bg-black"><div className="relative aspect-[16/10] bg-white/5">{imagePreview ? <Image src={imagePreview} alt="" fill unoptimized className="object-cover" /> : <div className="grid size-full place-items-center text-sm text-white/35">Wybrane zdjęcie pojawi się tutaj</div>}</div><div className="p-5"><p className="font-mono text-xs font-bold uppercase tracking-wider text-orange-400">{preview.category} · {formatDate(preview.publicationDate)}</p><h2 className="font-display mt-3 text-4xl font-black uppercase leading-none">{preview.title}</h2><p className="mt-4 font-semibold leading-6 text-white/75">{preview.summary}</p><p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/50">{preview.content}</p></div></article></aside>
    </div>
  </div></main>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
