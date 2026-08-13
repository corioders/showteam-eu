"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, CheckCircle2, Film, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
const categories = ["Lato", "Zima", "Szkolenia"] as const;

async function loadSession(): Promise<{ name?: string; email?: string } | null> {
  const response = await fetch("/api/users/me", { cache: "no-store", credentials: "same-origin" });
  const result = await response.json() as { user?: { name?: string; email?: string } | null };
  return result.user || null;
}

export function QuickUploader() {
  const input = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<{ status: "checking" | "ready" | "error"; userName?: string }>({ status: "checking" });
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<(typeof categories)[number]>("Lato");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => {
    let active = true;
    loadSession().then((user) => {
      if (!active) return;
      if (!user) {
        window.location.replace("/admin/login?redirect=%2Fdodaj");
        return;
      }
      setSession({ status: "ready", userName: user.name || user.email || "SHOWteam" });
    }).catch(() => {
      if (active) setSession({ status: "error" });
    });
    return () => { active = false; };
  }, []);

  async function retrySession() {
    setSession({ status: "checking" });
    try {
      const user = await loadSession();
      if (!user) {
        window.location.replace("/admin/login?redirect=%2Fdodaj");
        return;
      }
      setSession({ status: "ready", userName: user.name || user.email || "SHOWteam" });
    } catch {
      setSession({ status: "error" });
    }
  }

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  if (session.status !== "ready") {
    return <main className="grid min-h-dvh place-items-center bg-[#080a0b] px-6 text-center text-white">
      <div>
        <p className="font-display text-3xl font-black uppercase">SHOWteam<span className="text-orange-500">.</span></p>
        {session.status === "checking"
          ? <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/55"><LoaderCircle className="size-4 animate-spin" /> Sprawdzam logowanie…</p>
          : <><p className="mt-4 text-sm text-red-300">Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.</p><button type="button" onClick={() => void retrySession()} className="mt-5 bg-orange-500 px-5 py-3 font-bold text-black">Spróbuj ponownie</button></>}
      </div>
    </main>;
  }

  function choose(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected).slice(0, 8);
    const bytes = next.reduce((sum, file) => sum + file.size, 0);
    if (bytes > MAX_TOTAL_BYTES) {
      setStatus("error");
      setMessage("Pliki są za duże. Łączny limit jednego dodawania to 80 MB.");
      return;
    }
    setFiles(next);
    setStatus("idle");
    setMessage("");
  }

  async function publish() {
    if (!files.length || status === "uploading") return;
    setStatus("uploading");
    setMessage(`Wysyłam 0 z ${files.length}…`);

    try {
      const body = new FormData();
      files.forEach((file) => body.append("files", file));
      body.set("category", category);
      body.set("caption", caption.trim());
      const response = await fetch("/api/quick-upload", { method: "POST", body });
      const result = await response.json() as { count?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać plików.");
      setStatus("done");
      setMessage(`Opublikowano ${result.count} ${result.count === 1 ? "materiał" : "materiały"}.`);
      setFiles([]);
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
          <div><p className="font-display text-xl font-black uppercase">SHOWteam<span className="text-orange-500">.</span></p><p className="text-xs text-white/45">Zalogowano: {session.userName}</p></div>
          <Link href="/admin" className="text-sm font-bold text-white/70 underline decoration-white/20 underline-offset-4">Pełny CMS</Link>
        </header>

        <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-orange-400">Szybkie dodawanie</p>
        <h1 className="font-display mt-3 text-5xl font-black uppercase leading-[.9]">Wrzuć z telefonu.</h1>
        <p className="mt-4 text-sm leading-6 text-white/55">Zdjęcia i krótkie filmy trafią od razu do Galerii. Maksymalnie 8 plików i 80 MB łącznie.</p>

        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime" multiple className="sr-only" onChange={(event) => choose(event.target.files)} />
        <button type="button" onClick={() => input.current?.click()} className="mt-7 flex min-h-44 w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-orange-500/70 bg-orange-500/10 p-6 text-center transition active:scale-[.99]">
          <span className="grid size-14 place-items-center rounded-full bg-orange-500 text-black"><ImagePlus className="size-7" /></span>
          <strong className="text-lg">Wybierz zdjęcia lub filmy</strong>
          <span className="text-xs text-white/45">JPG, PNG, WebP, MP4, MOV, WebM</span>
        </button>

        {previews.length ? <div className="mt-4 grid grid-cols-3 gap-2">{previews.map(({ file, url }, index) => <div key={`${file.name}-${file.lastModified}`} className="relative aspect-square overflow-hidden bg-white/5">
          {file.type.startsWith("video/") ? <video src={url} muted playsInline className="size-full object-cover" /> : <Image src={url} alt="" fill unoptimized className="object-cover" />}
          <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-1 text-[.6rem]">{file.type.startsWith("video/") ? <Film className="size-3" /> : <Camera className="size-3" />}</span>
          <button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setFiles((current) => current.filter((_, item) => item !== index))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/80"><X className="size-4" /></button>
        </div>)}</div> : null}

        <fieldset className="mt-7"><legend className="mb-3 text-sm font-bold">Kategoria</legend><div className="grid grid-cols-3 gap-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className="border border-white/20 px-2 py-3 text-sm font-bold aria-pressed:border-orange-500 aria-pressed:bg-orange-500 aria-pressed:text-black">{item}</button>)}</div></fieldset>
        <label className="mt-6 block text-sm font-bold">Podpis <span className="font-normal text-white/40">(opcjonalny)</span><input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={100} placeholder="np. SHOWCamp 2026" className="mt-2 w-full border border-white/20 bg-white/5 px-4 py-3 font-normal text-white outline-none placeholder:text-white/25 focus:border-orange-500" /></label>

        {message ? <p role="status" className={`mt-5 flex items-center gap-2 border-l-2 py-2 pl-3 text-sm ${status === "error" ? "border-red-500 text-red-300" : "border-green-500 text-green-300"}`}>{status === "done" ? <CheckCircle2 className="size-5" /> : null}{message}</p> : null}
        <button type="button" disabled={!files.length || status === "uploading"} onClick={publish} className="mt-6 flex w-full items-center justify-center gap-2 bg-orange-500 px-5 py-4 text-base font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-35">
          {status === "uploading" ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}{status === "uploading" ? "Wysyłam…" : "Opublikuj w galerii"}
        </button>
        <p className="mt-6 text-center text-xs leading-5 text-white/35">Instalacja: w Safari wybierz Udostępnij → „Do ekranu początkowego”. W Chrome: menu → „Zainstaluj aplikację”.</p>
      </div>
    </main>
  );
}
