"use client";

import Link from "next/link";
import { AdminSessionGate } from "@/components/admin-session-gate";
import { adminTasks } from "@/lib/admin-tasks";

export function PwaDashboard() {
  return <AdminSessionGate redirectPath="/a/dodaj">{(userName) =>
    <main className="min-h-dvh bg-[#f7f7f4] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-[#292929] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-black/10 pb-4">
          <div><p className="font-display text-xl font-black uppercase">SHOWteam<span className="text-orange-600">.</span></p><p className="text-xs text-black/45">{userName}</p></div>
          <Link href="/admin/logout" prefetch={false} className="text-sm font-bold underline decoration-black/20 underline-offset-4">Wyloguj</Link>
        </header>

        <section className="py-8 sm:py-12">
          <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-orange-600">Panel SHOWteam</p>
          <h1 className="mt-3 text-[clamp(2.5rem,8vw,5rem)] font-black leading-none tracking-[-.055em]">Co chcesz zrobić?</h1>
          <p className="mt-4 text-base text-black/55">Wybierz zadanie. Panel otworzy od razu właściwe miejsce.</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adminTasks.map((task, index) => <Link href={task.href} key={task.href} className="group flex min-h-44 flex-col border border-black/15 bg-[#efefed] p-5 transition hover:border-orange-600 focus-visible:border-orange-600 focus-visible:outline-none sm:min-h-52 sm:p-6">
            <span className="font-mono text-xs font-bold tracking-[.18em] text-orange-600">{String(index + 1).padStart(2, "0")}</span>
            <strong className="mt-8 text-xl tracking-[-.025em] sm:text-2xl">{task.title}</strong>
            <p className="mt-1 text-sm leading-6 text-black/55 sm:text-base">{task.description}</p>
            <span className="mt-auto pt-6 text-xs font-black uppercase tracking-wide">Otwórz <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
          </Link>)}
        </div>
      </div>
    </main>
  }</AdminSessionGate>;
}
