"use client";

import { useState } from "react";
import { AvailabilityBlocks } from "@/components/payload/availability-blocks";
import { CalendarSubscription } from "@/components/payload/calendar-subscription";

export function CalendarAdminView() {
  const [calendarVersion, setCalendarVersion] = useState(0);
  return (
    <div className="calendar-admin-view">
      <div className="calendar-admin-heading"><div><span>REZERWACJE</span><h1>Kalendarz bazy</h1><p>Odświeża się automatycznie co 30 sekund.</p></div></div>
      <AvailabilityBlocks onChange={() => setCalendarVersion((version) => version + 1)} />
      <CalendarSubscription />
      <iframe key={calendarVersion} className="calendar-admin-frame" src="/a/kalendarz" title="Kalendarz rezerwacji" />
    </div>
  );
}
