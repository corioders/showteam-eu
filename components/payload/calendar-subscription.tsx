"use client";

import { CalendarPlus, Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type CalendarFeed = { id: string; name: string; created_at: number };
type CreatedFeed = { id: string; name: string; url: string; webcalUrl: string };

export function CalendarSubscription() {
  const [feeds, setFeeds] = useState<CalendarFeed[]>([]);
  const [created, setCreated] = useState<CreatedFeed | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "working">("loading");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/calendar/subscriptions", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setFeeds(await response.json() as CalendarFeed[]);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") { setError("Nie udało się pobrać subskrypcji."); setStatus("ready"); }
      });
    return () => controller.abort();
  }, []);

  async function createFeed() {
    setStatus("working");
    setError("");
    const response = await fetch("/api/calendar/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kalendarz rezerwacji" }),
    });
    if (!response.ok) {
      setError("Nie udało się utworzyć linku. Spróbuj ponownie.");
      setStatus("ready");
      return;
    }
    const feed = await response.json() as CreatedFeed;
    setCreated(feed);
    setFeeds((current) => [{ id: feed.id, name: feed.name, created_at: Date.now() }, ...current]);
    setStatus("ready");
  }

  async function copyUrl() {
    if (!created) return;
    await navigator.clipboard.writeText(created.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function revoke(feed: CalendarFeed) {
    if (!window.confirm("Wyłączyć tę subskrypcję? Kalendarz przestanie się aktualizować na połączonym urządzeniu.")) return;
    const response = await fetch("/api/calendar/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: feed.id }),
    });
    if (!response.ok) return setError("Nie udało się wyłączyć subskrypcji.");
    setFeeds((current) => current.filter((item) => item.id !== feed.id));
    if (created?.id === feed.id) setCreated(null);
  }

  return <section className="calendar-subscription">
    <div className="calendar-subscription__intro">
      <div><span>SUBSKRYPCJA ICS</span><h2>Rezerwacje w telefonie</h2><p>Dodaj kalendarz raz. Nowe rezerwacje i zmiany będą pobierane automatycznie przez aplikację kalendarza.</p></div>
      <button type="button" disabled={status !== "ready"} onClick={() => void createFeed()}><CalendarPlus aria-hidden="true" /> Utwórz prywatny link</button>
    </div>

    {status === "loading" ? <p className="calendar-subscription__status"><RefreshCw aria-hidden="true" /> Sprawdzam subskrypcje…</p> : null}
    {error ? <p role="alert" className="calendar-subscription__error">{error}</p> : null}

    {created ? <div className="calendar-subscription__created">
      <strong>Link gotowy — zapisz go teraz</strong>
      <p>To prywatny link z danymi rezerwacji. Nie wysyłaj go osobom spoza SHOWteam.</p>
      <input aria-label="Adres subskrypcji kalendarza" readOnly value={created.url} onFocus={(event) => event.currentTarget.select()} />
      <div><a href={created.webcalUrl}>Otwórz w kalendarzu</a><button type="button" onClick={() => void copyUrl()}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Skopiowano" : "Kopiuj link"}</button></div>
      <small>Google Calendar: „Inne kalendarze” → „Z adresu URL” → wklej skopiowany link.</small>
    </div> : null}

    {feeds.length ? <div className="calendar-subscription__feeds"><h3>Aktywne subskrypcje</h3>{feeds.map((feed) => <article key={feed.id}><div><strong>{feed.name}</strong><p>Utworzono {new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" }).format(feed.created_at)}</p></div><button type="button" onClick={() => void revoke(feed)}><Trash2 aria-hidden="true" /> Wyłącz</button></article>)}</div> : null}
  </section>;
}
