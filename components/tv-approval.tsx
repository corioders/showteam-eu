"use client";

import { useState } from "react";
import { Check, MonitorUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TvApproval({ id, secret, userName }: { id: string; secret: string; userName: string }) {
  const [state, setState] = useState<"ready" | "loading" | "done" | "error">("ready");
  async function approve() {
    setState("loading");
    const response = await fetch("/api/tv/pairing/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, secret }) });
    setState(response.ok ? "done" : "error");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-5 text-white">
      <section className="w-full max-w-lg border border-white/10 bg-[#101214] p-7 sm:p-10">
        {state === "done" ? <><div className="flex size-14 items-center justify-center rounded-full bg-orange-500 text-black"><Check className="size-7" /></div><h1 className="mt-7 font-display text-5xl font-black uppercase">TV połączony</h1><p className="mt-4 leading-7 text-white/55">Kalendarz uruchomi się na telewizorze automatycznie. Możesz zamknąć tę stronę.</p></> : <>
          <MonitorUp className="size-10 text-orange-500" /><p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-orange-400">Zalogowany: {userName}</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none">Udostępnić kalendarz temu TV?</h1>
          <p className="mt-5 leading-7 text-white/55">Urządzenie zobaczy grafik rezerwacji i dane kontaktowe klientów przez 30 dni. Nie dostanie dostępu do edycji ani panelu CMS.</p>
          {state === "error" && <p role="alert" className="mt-5 border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Kod wygasł albo został już wykorzystany. Wygeneruj nowy na TV.</p>}
          <Button onClick={approve} disabled={state === "loading" || state === "error"} size="lg" className="mt-7 w-full"><ShieldCheck className="size-5" />{state === "loading" ? "Łączę…" : "Tak, połącz TV"}</Button>
        </>}
      </section>
    </main>
  );
}
