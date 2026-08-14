"use client";

import { CalendarDays, ExternalLink, Link2, RefreshCw, Unplug } from "lucide-react";
import { useEffect, useState } from "react";

type ConnectionStatus = {
  configured: boolean;
  connected: boolean;
  calendarName?: string;
  accountEmail?: string;
  lastSyncedAt?: number;
  callbackUrl: string;
};

export function GoogleCalendarConnection() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/google-calendar/status", { cache: "no-store" });
    if (!response.ok) throw new Error();
    setStatus(await response.json() as ConnectionStatus);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/google-calendar/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setStatus(await response.json() as ConnectionStatus);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError("Nie udało się sprawdzić połączenia z Google."); });
    return () => controller.abort();
  }, []);

  async function action(path: "sync" | "disconnect") {
    if (path === "disconnect" && !window.confirm("Odłączyć Google Calendar? Wpisy pozostaną w Google, ale przestaną się synchronizować.")) return;
    setWorking(true);
    setError("");
    const response = await fetch(`/api/admin/google-calendar/${path}`, { method: "POST" });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(body.error || "Nie udało się wykonać tej operacji.");
    else await load();
    setWorking(false);
  }

  if (!status) return <p className="calendar-subscription__status"><RefreshCw aria-hidden="true" /> Sprawdzam Google Calendar…</p>;

  return <section className="calendar-subscription">
    <div className="calendar-subscription__intro">
      <div><span>GOOGLE CALENDAR</span><h2>Kalendarz bazy w telefonie</h2><p>Rezerwacje ze strony trafiają do Google. Ręczne wpisy z Google pojawiają się tutaj i na telewizorze.</p></div>
      {status.connected
        ? <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer"><CalendarDays aria-hidden="true" /> Otwórz kalendarz</a>
        : status.configured ? <form action="/api/admin/google-calendar/connect"><button type="submit"><Link2 aria-hidden="true" /> Połącz konto Google</button></form> : null}
    </div>

    {error ? <p role="alert" className="calendar-subscription__error">{error}</p> : null}
    {!status.configured ? <div className="calendar-subscription__created"><strong>Połączenie czeka na jednorazową konfigurację</strong><p>Administrator strony musi dodać dane Google. Potem obsługa połączy konto jednym przyciskiem.</p><small>Adres przekierowania dla konfiguracji: {status.callbackUrl}</small></div> : null}

    {status.connected ? <div className="calendar-subscription__connected">
      <div><strong>{status.calendarName}</strong><p>{status.accountEmail}</p>{status.lastSyncedAt ? <small>Ostatnia synchronizacja: {new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" }).format(status.lastSyncedAt)}</small> : <small>Pierwsza synchronizacja jeszcze się nie zakończyła.</small>}</div>
      <div><button type="button" disabled={working} onClick={() => void action("sync")}><RefreshCw aria-hidden="true" /> Synchronizuj teraz</button><button type="button" disabled={working} onClick={() => void action("disconnect")}><Unplug aria-hidden="true" /> Odłącz</button></div>
    </div> : null}

    <div className="calendar-subscription__rules">
      <article><strong>Rezerwacja ze strony</strong><p>Automatycznie pojawi się w Google Calendar.</p></article>
      <article><strong>Wpis dodany w Google</strong><p>Pojawi się jako fioletowy „Plan bazy” tutaj i na TV.</p></article>
      <article><strong>Zamknięcie wynajmu</strong><p>Ustaw w „Zablokuj wynajem”. Sam wpis Google nie blokuje klientom terminu.</p></article>
    </div>
    {status.connected ? <a className="calendar-subscription__help" href="https://support.google.com/calendar/answer/37100?hl=pl" target="_blank" rel="noreferrer">Jak dodać ten kalendarz na telefonie? <ExternalLink aria-hidden="true" /></a> : null}
  </section>;
}
