"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import plLocale from "@fullcalendar/core/locales/pl";
import type { EventSourceFuncArg } from "@fullcalendar/core";
import { Ban, CalendarDays, Clock3, ExternalLink, Mail, Phone, X } from "lucide-react";
import styles from "@/components/calendar.module.css";

type CalendarEvent = { id: string; title: string; start: string; end: string; allDay?: boolean; extendedProps: { kind: "booking" | "block" | "availability" | "google"; reference: string; phone: string; email: string; status: string; notes: string; url?: string } };

export function OperationsCalendar({ tv = false }: { tv?: boolean }) {
  const calendarRef = useRef<FullCalendar>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [compact, setCompact] = useState<boolean | null>(tv ? true : null);

  useEffect(() => {
    if (!tv) {
      const media = window.matchMedia("(max-width: 700px)");
      const update = () => setCompact(media.matches);
      update();
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
  }, [tv]);

  useEffect(() => {
    const timer = window.setInterval(() => calendarRef.current?.getApi().refetchEvents(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function events(info: EventSourceFuncArg, success: (events: CalendarEvent[]) => void, failure: (error: Error) => void) {
    try {
      const response = await fetch(`/api/calendar/events?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`, { cache: "no-store" });
      if (response.status === 401 && tv) return window.location.reload();
      if (!response.ok) throw new Error("Nie udało się odświeżyć kalendarza.");
      success(await response.json() as CalendarEvent[]);
    } catch (error) { failure(error as Error); }
  }

  if (compact === null) return <p className={styles.loading}>Ładuję kalendarz…</p>;

  return (
    <div className={`${styles.calendar} ${tv ? styles.calendarTv : ""}`}>
      <FullCalendar key={compact ? "compact" : "desktop"} ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, listPlugin]} locale={plLocale} initialView={compact ? "listUpcoming" : "timeGridWeek"} events={events}
        firstDay={1} allDaySlot nowIndicator height={tv ? "calc(100vh - 8rem)" : "auto"} slotMinTime="07:00:00" slotMaxTime="22:00:00"
        views={{ listUpcoming: { type: "list", duration: { days: tv ? 365 : 31 }, buttonText: "Lista" } }}
        eventOrder="start"
        headerToolbar={{ left: "prev,next today", center: "title", right: compact ? "listUpcoming" : "timeGridDay,timeGridWeek,dayGridMonth,listUpcoming" }}
        buttonText={{ today: "Dziś", day: "Dzień", week: "Tydzień", month: "Miesiąc", list: "Lista" }}
        eventClick={(info) => setSelected(info.event.toPlainObject() as CalendarEvent)} eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }} />
      {selected && <div className={styles.overlay} onClick={() => setSelected(null)}>
        <div role="dialog" aria-modal="true" aria-label="Szczegóły rezerwacji" className={styles.dialog} onClick={(event) => event.stopPropagation()}>
          <button className={styles.close} onClick={() => setSelected(null)} aria-label="Zamknij"><X /></button>
          <p className={styles.reference}>{selected.extendedProps.kind === "block" ? <><Ban size={14} /> Blokada terminu</> : selected.extendedProps.kind === "google" ? <><CalendarDays size={14} /> Plan bazy</> : selected.extendedProps.reference}</p>
          <h2 className={styles.eventTitle}>{selected.title}</h2>
          <p className={styles.detail}><Clock3 size={16} />{selected.start.slice(0, 10)}{selected.allDay ? " · cały dzień" : ` · ${selected.start.slice(11, 16)}–${selected.end.slice(11, 16)}`}</p>
          {selected.extendedProps.phone && <a href={`tel:${selected.extendedProps.phone}`} className={styles.phone}><Phone size={16} />{selected.extendedProps.phone}</a>}
          {selected.extendedProps.email && <a href={`mailto:${selected.extendedProps.email}`} className={styles.phone}><Mail size={16} />{selected.extendedProps.email}</a>}
          {selected.extendedProps.notes && <p className={styles.notes}>{selected.extendedProps.notes}</p>}
          {selected.extendedProps.url && <a className={styles.external} href={selected.extendedProps.url} target="_blank" rel="noreferrer">Otwórz w Google Calendar <ExternalLink size={16} /></a>}
        </div>
      </div>}
    </div>
  );
}
