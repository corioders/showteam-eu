"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AvailabilityBlocks } from "@/components/payload/availability-blocks";
import { AvailabilityHours } from "@/components/payload/availability-hours";
import { GoogleCalendarConnection } from "@/components/payload/google-calendar-connection";
import { EquipmentRecommendations } from "@/components/payload/equipment-recommendations";

const OperationsCalendar = dynamic(() => import("@/components/operations-calendar").then((module) => module.OperationsCalendar), { ssr: false });

export function CalendarAdminView() {
  const [section, setSection] = useState<"calendar" | "availability" | "recommendations" | "sync">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("google") ? "sync" : typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "dostepnosc" ? "availability" : "calendar",
  );
  const selectedEquipmentId = typeof window === "undefined" ? undefined : Number(new URLSearchParams(window.location.search).get("equipment")) || undefined;
  const [calendarVersion, setCalendarVersion] = useState(0);
  const changed = () => setCalendarVersion((version) => version + 1);
  return (
    <div className="calendar-admin-view">
      <div className="calendar-admin-heading"><div><span>REZERWACJE</span><h1>Kalendarz bazy</h1><p>Rezerwacje, godziny wynajmu i blokady w jednym miejscu.</p></div></div>
      <nav className="calendar-admin-tabs" aria-label="Sekcje kalendarza">
        <button type="button" aria-current={section === "calendar" ? "page" : undefined} onClick={() => setSection("calendar")}>Kalendarz</button>
        <button type="button" aria-current={section === "availability" ? "page" : undefined} onClick={() => setSection("availability")}>Zablokuj wynajem</button>
        <button type="button" aria-current={section === "recommendations" ? "page" : undefined} onClick={() => setSection("recommendations")}>Polecane godziny</button>
        <button type="button" aria-current={section === "sync" ? "page" : undefined} onClick={() => setSection("sync")}>Synchronizacja</button>
      </nav>
      {section === "calendar" ? <div key={calendarVersion} className="calendar-admin-calendar"><OperationsCalendar /></div> : null}
      {section === "availability" ? <div className="calendar-admin-settings"><AvailabilityBlocks onChange={changed} selectedEquipmentId={selectedEquipmentId} /><AvailabilityHours onChange={changed} selectedEquipmentId={selectedEquipmentId} /></div> : null}
      {section === "recommendations" ? <EquipmentRecommendations /> : null}
      {section === "sync" ? <GoogleCalendarConnection /> : null}
    </div>
  );
}
