import Link from "next/link";

export function CalendarAdminView() {
  return (
    <div className="calendar-admin-view">
      <div className="calendar-admin-heading"><div><span>REZERWACJE</span><h1>Kalendarz bazy</h1><p>Odświeża się automatycznie co 30 sekund.</p></div><Link href="/tv" target="_blank">Otwórz ekran TV</Link></div>
      <iframe className="calendar-admin-frame" src="/kalendarz" title="Kalendarz rezerwacji" />
    </div>
  );
}
