"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, CheckCircle2, Film, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminSessionGate } from "@/components/admin-session-gate";

const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
const IMAGE_VARIANTS = [{ key: "small", edge: 640, quality: 0.78 }, { key: "medium", edge: 1280, quality: 0.84 }, { key: "large", edge: 2560, quality: 0.9 }] as const;
const categories = ["Lato", "Zima", "Szkolenia"] as const;
type UploadItem = { id: string; file: File; focalX: number; focalY: number };

export function QuickUploader() {
  return <AdminSessionGate redirectPath="/a/dodaj/galeria">{(userName) => <QuickUploaderForm userName={userName} />}</AdminSessionGate>;
}

function QuickUploaderForm({ userName }: { userName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [category, setCategory] = useState<(typeof categories)[number]>("Lato");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const previews = useMemo(() => items.map((item) => ({ ...item, url: URL.createObjectURL(item.file) })), [items]);

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  function choose(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected).slice(0, 8);
    const bytes = next.reduce((sum, file) => sum + file.size, 0);
    if (bytes > MAX_TOTAL_BYTES) {
      setStatus("error");
      setMessage("Pliki są za duże. Łączny limit jednego dodawania to 80 MB.");
      return;
    }
    setItems(next.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, file, focalX: 50, focalY: 50 })));
    setStatus("idle");
    setMessage("");
  }

  async function publish() {
    if (!items.length || status === "uploading") return;
    setStatus("uploading");
    setMessage(`Przygotowuję ${items.length === 1 ? "materiał" : "materiały"}…`);

    try {
      const body = new FormData();
      for (const [index, item] of items.entries()) {
        setMessage(`Przygotowuję ${index + 1} z ${items.length}…`);
        if (item.file.type.startsWith("image/")) {
          const variants = await createPhotoVariants(item.file);
          body.append("files", variants.large);
          body.append(`small-${index}`, variants.small);
          body.append(`medium-${index}`, variants.medium);
        } else {
          body.append("files", item.file);
        }
      }
      body.set("category", category);
      body.set("caption", caption.trim());
      body.set("focalPoints", JSON.stringify(items.map(({ focalX: x, focalY: y }) => ({ x, y }))));
      setMessage(`Wysyłam ${items.length === 1 ? "materiał" : `${items.length} materiałów`}…`);
      const response = await fetch("/api/quick-upload", { method: "POST", body });
      const result = await response.json() as { count?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać plików.");
      setStatus("done");
      setMessage(`Opublikowano ${result.count} ${result.count === 1 ? "materiał" : "materiały"}.`);
      setItems([]);
      setCaption("");
      if (input.current) input.current.value = "";
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Nie udało się wysłać plików.");
    }
  }

  return (
    <main className="min-h-dvh bg-[#080a0b] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 flex items-center justify-between border-b border-white/15 pb-4">
          <div><p className="font-display text-xl font-black uppercase">SHOWteam<span className="text-orange-500">.</span></p><p className="text-xs text-white/45">Zalogowano: {userName}</p></div>
          <Link href="/admin" className="bg-orange-500 px-3 py-2 text-xs font-black uppercase text-black">← Wróć do panelu</Link>
        </header>

        <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-orange-400">Szybkie dodawanie</p>
        <h1 className="font-display mt-3 text-5xl font-black uppercase leading-[.9]">Wrzuć z telefonu.</h1>
        <p className="mt-4 text-sm leading-6 text-white/55">Zdjęcia i krótkie filmy trafią od razu do Galerii. Uploader przygotuje lekkie WebP na telefon, tablet i duży ekran.</p>

        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" multiple className="sr-only" onChange={(event) => choose(event.target.files)} />
        <button type="button" onClick={() => input.current?.click()} className="mt-7 flex min-h-44 w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-orange-500/70 bg-orange-500/10 p-6 text-center transition active:scale-[.99]">
          <span className="grid size-14 place-items-center rounded-full bg-orange-500 text-black"><ImagePlus className="size-7" /></span>
          <strong className="text-lg">Wybierz zdjęcia lub filmy</strong>
          <span className="text-xs text-white/45">JPG, PNG, WebP, AVIF, MP4, MOV, WebM</span>
        </button>

        {previews.length ? <div className="mt-5 space-y-4">{previews.map(({ id, file, url, focalX, focalY }) => {
          const video = file.type.startsWith("video/");
          return <article key={id} className="border border-white/15 bg-white/[.035] p-3">
            <div className={`relative overflow-hidden bg-black ${video ? "aspect-video" : "aspect-square"}`}>
              {video ? <video src={url} muted playsInline controls className="size-full object-cover" /> : <Image src={url} alt="Podgląd kadru" fill unoptimized className="object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} />}
              <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-[.65rem]">{video ? <Film className="size-3.5" /> : <Camera className="size-3.5" />}</span>
              <button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setItems((current) => current.filter((item) => item.id !== id))} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-black/85"><X className="size-4" /></button>
            </div>
            {!video ? <div className="mt-3">
              <p className="text-sm font-bold">Kadr widoczny w galerii</p>
              <p className="mt-1 text-xs leading-5 text-white/45">Przesuń suwaki, aż najważniejsza część zdjęcia będzie dobrze widoczna w kwadracie powyżej.</p>
              <label className="mt-3 grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs text-white/65">Lewo–prawo<input aria-label={`Kadr poziomy: ${file.name}`} type="range" min="0" max="100" value={focalX} onChange={(event) => updateFocalPoint(id, "focalX", Number(event.target.value))} className="accent-orange-500" /></label>
              <label className="mt-2 grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs text-white/65">Góra–dół<input aria-label={`Kadr pionowy: ${file.name}`} type="range" min="0" max="100" value={focalY} onChange={(event) => updateFocalPoint(id, "focalY", Number(event.target.value))} className="accent-orange-500" /></label>
            </div> : null}
          </article>;
        })}</div> : null}

        <fieldset className="mt-7"><legend className="mb-3 text-sm font-bold">Kategoria</legend><div className="grid grid-cols-3 gap-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className="border border-white/20 px-2 py-3 text-sm font-bold aria-pressed:border-orange-500 aria-pressed:bg-orange-500 aria-pressed:text-black">{item}</button>)}</div></fieldset>
        <label className="mt-6 block text-sm font-bold">Podpis <span className="font-normal text-white/40">(opcjonalny)</span><input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={100} placeholder="np. SHOWCamp 2026" className="mt-2 w-full border border-white/20 bg-white/5 px-4 py-3 font-normal text-white outline-none placeholder:text-white/25 focus:border-orange-500" /></label>

        {message ? <p role="status" className={`mt-5 flex items-center gap-2 border-l-2 py-2 pl-3 text-sm ${status === "error" ? "border-red-500 text-red-300" : "border-green-500 text-green-300"}`}>{status === "done" ? <CheckCircle2 className="size-5" /> : null}{message}</p> : null}
        <button type="button" disabled={!items.length || status === "uploading"} onClick={publish} className="mt-6 flex w-full items-center justify-center gap-2 bg-orange-500 px-5 py-4 text-base font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-35">
          {status === "uploading" ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}{status === "uploading" ? "Wysyłam…" : "Opublikuj w galerii"}
        </button>
        <p className="mt-6 text-center text-xs leading-5 text-white/35">Instalacja: w Safari wybierz Udostępnij → „Do ekranu początkowego”. W Chrome: menu → „Zainstaluj aplikację”.</p>
      </div>
    </main>
  );

  function updateFocalPoint(id: string, axis: "focalX" | "focalY", value: number) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [axis]: value } : item));
  }
}

async function createPhotoVariants(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const entries = await Promise.all(IMAGE_VARIANTS.map(async ({ key, edge, quality }) => [key, await renderWebP(bitmap, file, edge, quality)] as const));
    return Object.fromEntries(entries) as Record<(typeof IMAGE_VARIANTS)[number]["key"], File>;
  } finally {
    bitmap.close();
  }
}

async function renderWebP(bitmap: ImageBitmap, source: File, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Nie udało się przygotować zdjęcia. Wybierz je ponownie.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Ta przeglądarka nie potrafi przygotować WebP. Zaktualizuj ją i spróbuj ponownie.");
  return new File([blob], source.name.replace(/\.[^.]+$/, `-${maxEdge}.webp`), { type: "image/webp", lastModified: source.lastModified });
}
