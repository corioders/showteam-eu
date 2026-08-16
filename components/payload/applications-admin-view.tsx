"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { applicationAge, applicationStatusLabels, type ApplicationStatus } from "@/lib/applications";

type History = { id: number; reference: string; createdAt: string; status: ApplicationStatus; offer: string };
type Application = { id: number; reference: string; createdAt: string; status: ApplicationStatus; offer: string; participantName: string; birthDate: string; email: string; phone: string; priorCount: number; history: History[] };
type NewsletterContact = { email: string; contact_name: string; consented_at: string | null; applications: number };
type Data = { applications: Application[]; total: number; newsletter: NewsletterContact[] };
const date = (value: string) => new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(value));

export function ApplicationsAdminView() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"applications" | "newsletter">("applications");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  async function changeStatus(id: number, status: ApplicationStatus) {
    setSavingId(id);
    const response = await fetch("/api/admin/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setSavingId(null);
    if (!response.ok) return setError("Nie udało się zmienić statusu. Odśwież stronę i spróbuj ponownie.");
    setData((current) => current ? { ...current, applications: current.applications.map((entry) => entry.id === id ? { ...entry, status } : entry) } : current);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/applications", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) { router.replace("/admin/login?redirect=/admin/zgloszenia"); return; }
        if (!response.ok) throw new Error();
        setData(await response.json() as Data);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError("Nie udało się pobrać zgłoszeń. Odśwież stronę."); });
    return () => controller.abort();
  }, [router]);

  if (error) return <main className="applications-admin"><p role="alert" className="statistics-error">{error}</p></main>;
  if (!data) return <main className="applications-admin"><p className="statistics-loading"><RefreshCw aria-hidden="true" /> Ładuję zgłoszenia…</p></main>;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  return <main className="applications-admin"><header><span>ZGŁOSZENIA</span><h1>Uczestnicy</h1><p>Od razu widzisz, kto jedzie pierwszy raz, a kto wraca. Każde nowe zgłoszenie nadal wymaga kontaktu.</p></header>
    <nav className="applications-tabs" aria-label="Widok zgłoszeń"><button aria-current={tab === "applications"} onClick={() => setTab("applications")}>Zgłoszenia <small>{data.total}</small></button><button aria-current={tab === "newsletter"} onClick={() => setTab("newsletter")}>Newsletter <small>{data.newsletter.length}</small></button></nav>
    {tab === "applications" ? <>
      <div className="applications-actions"><Link className="applications-export" href="/api/admin/applications/export"><Download aria-hidden="true" /> Pobierz zgłoszenia</Link><Link href="/admin/collections/applications">Zaawansowana lista</Link></div>
      <p className="applications-total">Najnowsze na górze{data.total > data.applications.length ? ` · pokazano ${data.applications.length} z ${data.total}` : ""}</p>
      {data.applications.length ? <div className="applications-list">{data.applications.map((entry) => <article className="application-card" key={entry.id}>
        <div><strong>{entry.participantName}</strong><span className={`application-status application-status--${entry.status}`}>{applicationStatusLabels[entry.status]}</span></div>
        <p>{entry.offer}</p><span className={entry.priorCount ? "participant-returning" : "participant-new"}>{entry.priorCount ? `Powracający · ${entry.priorCount} wcześniejszych zgłoszeń` : "Pierwszy raz w SHOWteam"}</span>
        <dl><div><dt>Data urodzenia</dt><dd>{new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC" }).format(new Date(entry.birthDate))} · {applicationAge(entry.birthDate, today)} lat</dd></div><div><dt>Telefon</dt><dd>{entry.phone}</dd></div><div><dt>E-mail</dt><dd>{entry.email}</dd></div><div><dt>Wysłano</dt><dd>{date(entry.createdAt)}</dd></div><div><dt>Numer</dt><dd>{entry.reference}</dd></div></dl>
        {entry.history.length ? <details className="participant-history"><summary>Historia uczestnika</summary><ol>{entry.history.map((past) => <li key={past.id}><div><strong>{past.offer}</strong><span>{date(past.createdAt)}</span></div><small>{applicationStatusLabels[past.status]} · {past.reference}</small></li>)}</ol></details> : null}
        <label className="application-quick-status">Status<select value={entry.status} disabled={savingId === entry.id} onChange={(event) => void changeStatus(entry.id, event.target.value as ApplicationStatus)}>{Object.entries(applicationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <Link href={`/admin/collections/applications/${entry.id}`} className="application-open">Otwórz szczegóły i notatki →</Link>
      </article>)}</div> : <p className="applications-empty">Nie ma jeszcze żadnych zgłoszeń.</p>}
    </> : <section className="newsletter-list"><div><p>Tylko osoby, które dobrowolnie zaznaczyły zgodę. Każdy adres występuje raz.</p><Link className="applications-export" href="/api/admin/newsletter/export"><Download aria-hidden="true" /> Pobierz kontakty</Link></div>{data.newsletter.length ? <ul>{data.newsletter.map((contact) => <li key={contact.email}><div><strong>{contact.email}</strong><span>{contact.contact_name}</span></div><small>{contact.applications} {contact.applications === 1 ? "zgłoszenie" : "zgłoszenia"}{contact.consented_at ? ` · zgoda ${date(contact.consented_at)}` : ""}</small></li>)}</ul> : <p className="applications-empty">Nikt jeszcze nie wyraził zgody na newsletter.</p>}</section>}
  </main>;
}
