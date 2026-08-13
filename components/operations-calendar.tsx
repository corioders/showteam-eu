"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import plLocale from "@fullcalendar/core/locales/pl";
import type { EventSourceFuncArg } from "@fullcalendar/core";
import { Clock3, Phone, X } from "lucide-react";
import styles from "@/components/calendar.module.css";

type CalendarEvent = { id: string; title: string; start: string; end: string; extendedProps: { reference: string; phone: string; status: string; notes: string } };

export function OperationsCalendar({ tv = false }: { tv?: boolean }) {
  const calendarRef = useRef<FullCalendar>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const initialView = tv || (typeof window !== "undefined" && window.innerWidth < 700) ? "listUpcoming" : "timeGridWeek";

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

  return (
    <div className={`${styles.calendar} ${tv ? styles.calendarTv : ""}`}>
      <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, listPlugin]} locale={plLocale} initialView={initialView} events={events}
        firstDay={1} allDaySlot={false} nowIndicator height={tv ? "calc(100vh - 8rem)" : "auto"} slotMinTime="07:00:00" slotMaxTime="22:00:00"
        views={{ listUpcoming: { type: "list", duration: { days: 365 }, buttonText: "Lista" } }}
        eventOrder="start"
        headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth,listUpcoming" }}
        buttonText={{ today: "Dziś", day: "Dzień", week: "Tydzień", month: "Miesiąc", list: "Lista" }}
        eventClick={(info) => setSelected(info.event.toPlainObject() as CalendarEvent)} eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }} />
      {selected && <div className={styles.overlay} onClick={() => setSelected(null)}>
        <div role="dialog" aria-modal="true" aria-label="Szczegóły rezerwacji" className={styles.dialog} onClick={(event) => event.stopPropagation()}>
          <button className={styles.close} onClick={() => setSelected(null)} aria-label="Zamknij"><X /></button>
          <p className={styles.reference}>{selected.extendedProps.reference}</p>
          <h2 className={styles.eventTitle}>{selected.title}</h2>
          <p className={styles.detail}><Clock3 size={16} />{selected.start.slice(0, 10)} · {selected.start.slice(11, 16)}–{selected.end.slice(11, 16)}</p>
          <a href={`tel:${selected.extendedProps.phone}`} className={styles.phone}><Phone size={16} />{selected.extendedProps.phone}</a>
          {selected.extendedProps.notes && <p className={styles.notes}>{selected.extendedProps.notes}</p>}
        </div>
      </div>}
    </div>
  );
}
