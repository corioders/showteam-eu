"use client";

import { CalendarCheck, CalendarClock, CalendarX, CheckCircle2, Eye, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type Statistics = {
  traffic: { views_30d: number; views_today: number };
  bookings: { created_30d: number; upcoming: number; completed_30d: number; cancelled_30d: number };
  equipment: { name: string; value: number }[];
  pages: { name: string; value: number }[];
  generatedAt: number;
};

function Ranking({ title, empty, rows }: { title: string; empty: string; rows: { name: string; value: number }[] }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <section className="statistics-ranking"><h2>{title}</h2>{rows.length ? <ol>{rows.map((row) => <li key={row.name}><div><strong>{row.name}</strong><span>{row.value}</span></div><i aria-hidden="true" style={{ width: `${Math.max((row.value / maximum) * 100, 3)}%` }} /></li>)}</ol> : <p>{empty}</p>}</section>;
}

export function StatisticsAdminView() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/statistics", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setStatistics(await response.json() as Statistics);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError("Nie udało się pobrać statystyk. Odśwież stronę."); });
    return () => controller.abort();
  }, []);

  if (error) return <main className="statistics-admin"><p role="alert" className="statistics-error">{error}</p></main>;
  if (!statistics) return <main className="statistics-admin"><p className="statistics-loading"><RefreshCw aria-hidden="true" /> Ładuję statystyki…</p></main>;

  const cards = [
    [Eye, "Odwiedziny strony · dzisiaj", statistics.traffic.views_today],
    [Eye, "Odwiedziny strony · 30 dni", statistics.traffic.views_30d],
    [CalendarCheck, "Nowe rezerwacje · 30 dni", statistics.bookings.created_30d],
    [CalendarClock, "Nadchodzące rezerwacje", statistics.bookings.upcoming],
    [CheckCircle2, "Zrealizowane · 30 dni", statistics.bookings.completed_30d],
    [CalendarX, "Anulowane · 30 dni", statistics.bookings.cancelled_30d],
  ] as const;

  return <main className="statistics-admin">
    <header><span>OSTATNIE 30 DNI</span><h1>Statystyki</h1><p>Odwiedziny strony i rezerwacje w jednym miejscu. Bez danych osobowych i zbędnej historii.</p></header>
    <div className="statistics-cards">{cards.map(([Icon, label, value]) => <article key={label}><Icon aria-hidden="true" /><p>{label}</p><strong>{value}</strong></article>)}</div>
    <div className="statistics-rankings"><Ranking title="Najczęściej rezerwowany sprzęt" empty="Brak rezerwacji w ostatnich 30 dniach." rows={statistics.equipment} /><Ranking title="Najczęściej odwiedzane strony" empty="Brak wizyt w ostatnich 30 dniach." rows={statistics.pages} /></div>
    <p className="statistics-updated">Stan na {new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" }).format(statistics.generatedAt)}</p>
  </main>;
}
