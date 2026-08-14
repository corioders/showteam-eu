"use client";

import { useState } from "react";
import { AvailabilityBlocks } from "@/components/payload/availability-blocks";
import { AvailabilityHours } from "@/components/payload/availability-hours";
import { CalendarSubscription } from "@/components/payload/calendar-subscription";
import { OperationsCalendar } from "@/components/operations-calendar";

export function CalendarAdminView() {
  const [section, setSection] = useState<"calendar" | "availability" | "sync">("calendar");
  const [calendarVersion, setCalendarVersion] = useState(0);
  const changed = () => setCalendarVersion((version) => version + 1);
  return (
    <div className="calendar-admin-view">
      <div className="calendar-admin-heading"><div><span>REZERWACJE</span><h1>Kalendarz bazy</h1><p>Rezerwacje, godziny wynajmu i blokady w jednym miejscu.</p></div></div>
      <nav className="calendar-admin-tabs" aria-label="Sekcje kalendarza">
        <button type="button" aria-current={section === "calendar" ? "page" : undefined} onClick={() => setSection("calendar")}>Kalendarz</button>
        <button type="button" aria-current={section === "availability" ? "page" : undefined} onClick={() => setSection("availability")}>Zablokuj wynajem</button>
        <button type="button" aria-current={section === "sync" ? "page" : undefined} onClick={() => setSection("sync")}>Synchronizacja</button>
      </nav>
      {section === "calendar" ? <div key={calendarVersion} className="calendar-admin-calendar"><OperationsCalendar /></div> : null}
      {section === "availability" ? <div className="calendar-admin-settings"><AvailabilityBlocks onChange={changed} /><AvailabilityHours onChange={changed} /></div> : null}
      {section === "sync" ? <CalendarSubscription /> : null}
    </div>
  );
}
