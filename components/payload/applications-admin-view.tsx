"use client";

import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type Application = { id: number; reference: string; createdAt: string; status: "new" | "contacted" | "accepted" | "cancelled"; offer: string; participantName: string; email: string; phone: string };
const statusLabel = { new: "Nowe", contacted: "Skontaktowano", accepted: "Przyjęte", cancelled: "Anulowane" } as const;

export function ApplicationsAdminView() {
  const [data, setData] = useState<{ applications: Application[]; total: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/applications", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); setData(await response.json() as { applications: Application[]; total: number }); })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError("Nie udało się pobrać zgłoszeń. Odśwież stronę."); });
    return () => controller.abort();
  }, []);

  if (error) return <main className="applications-admin"><p role="alert" className="statistics-error">{error}</p></main>;
  if (!data) return <main className="applications-admin"><p className="statistics-loading"><RefreshCw aria-hidden="true" /> Ładuję zgłoszenia…</p></main>;

  return <main className="applications-admin"><header><span>ZGŁOSZENIA</span><h1>Uczestnicy</h1><p>Nowe zgłoszenia są na górze. Otwórz wpis, aby zmienić status lub dodać notatkę.</p><div><Link className="applications-export" href="/api/admin/applications/export"><Download aria-hidden="true" /> Pobierz do Excela</Link><Link href="/admin/collections/applications">Zaawansowana lista</Link></div></header>
    <p className="applications-total">Łącznie: <strong>{data.total}</strong>{data.total > data.applications.length ? ` · pokazano najnowsze ${data.applications.length}` : ""}</p>
    {data.applications.length ? <div className="applications-list">{data.applications.map((entry) => <Link href={`/admin/collections/applications/${entry.id}`} className="application-card" key={entry.id}><div><strong>{entry.participantName}</strong><span className={`application-status application-status--${entry.status}`}>{statusLabel[entry.status]}</span></div><p>{entry.offer}</p><dl><div><dt>Telefon</dt><dd>{entry.phone}</dd></div><div><dt>E-mail</dt><dd>{entry.email}</dd></div><div><dt>Wysłano</dt><dd>{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</dd></div><div><dt>Numer</dt><dd>{entry.reference}</dd></div></dl><span className="application-open">Otwórz zgłoszenie →</span></Link>)}</div> : <p className="applications-empty">Nie ma jeszcze żadnych zgłoszeń.</p>}
  </main>;
}
