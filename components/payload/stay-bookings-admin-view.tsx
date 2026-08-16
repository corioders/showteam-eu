"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stayBookingStatusLabels, type StayBookingStatus } from "@/lib/stay-bookings";

type Booking = { id: number; reference: string; status: StayBookingStatus; staffNotes?: string | null; accommodationTypes: string[]; checkIn: string; checkOut: string; guests: number; customerName: string; phone: string; email: string; customerNotes?: string | null };

export function StayBookingsAdminView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch("/api/admin/stay-bookings", { cache: "no-store" });
    const body = await response.json() as { bookings?: Booking[]; error?: string };
    if (!response.ok) setError(body.error || "Nie udało się pobrać noclegów."); else setBookings(body.bookings || []);
    setLoading(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/stay-bookings", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json() as { bookings?: Booking[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Nie udało się pobrać noclegów."); setBookings(body.bookings || []);
    }).catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return <main className="site-container py-10 sm:py-16"><header><span className="eyebrow">POBYTY NAD WODĄ</span><h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">Noclegi</h1><p className="mt-4 max-w-2xl text-white/55">Potwierdzaj dostępność i zapisuj ustalenia z gośćmi.</p></header>{loading ? <p className="mt-10 flex gap-2 text-white/55"><LoaderCircle className="size-4 animate-spin" /> Ładuję…</p> : null}{error ? <p className="mt-8 border border-red-500/40 p-4 text-red-200">{error}</p> : null}<div className="mt-10 grid gap-4">{bookings.map((booking) => <StayCard key={booking.id} booking={booking} onChanged={load} />)}</div>{!loading && !bookings.length ? <p className="mt-10 border border-white/15 p-8 text-white/55">Nie ma jeszcze rezerwacji noclegów.</p> : null}</main>;
}

function StayCard({ booking, onChanged }: { booking: Booking; onChanged: () => Promise<void> }) {
  const [status, setStatus] = useState(booking.status); const [notes, setNotes] = useState(booking.staffNotes || ""); const [working, setWorking] = useState(false); const [message, setMessage] = useState("");
  async function save() { setWorking(true); const response = await fetch("/api/admin/stay-bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: booking.id, status, staffNotes: notes }) }); setWorking(false); setMessage(response.ok ? "Zapisano." : "Nie udało się zapisać."); if (response.ok) await onChanged(); }
  return <article className="grid gap-6 border border-white/15 p-5 sm:p-6 lg:grid-cols-[1fr_22rem]"><div><div className="flex flex-wrap justify-between gap-3"><div><span className="font-mono text-xs text-orange-400">{booking.reference}</span><h2 className="mt-2 text-xl font-black">{booking.customerName}</h2></div><span className="border border-current px-2 py-1 text-xs font-bold uppercase text-orange-300">{stayBookingStatusLabels[booking.status]}</span></div><p className="mt-4 text-lg font-bold">{booking.checkIn.slice(0, 10)} – {booking.checkOut.slice(0, 10)}</p><p className="mt-2 text-white/55">{booking.accommodationTypes.join(" lub ")} · {booking.guests} {booking.guests === 1 ? "gość" : "gości"}</p><div className="mt-4 flex flex-wrap gap-2"><a href={`tel:${booking.phone}`} className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-3"><Phone className="size-4" /> {booking.phone}</a><a href={`mailto:${booking.email}`} className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-3"><Mail className="size-4" /> {booking.email}</a></div>{booking.customerNotes ? <p className="mt-4 border-l-2 border-orange-500 pl-3 text-white/65">{booking.customerNotes}</p> : null}</div><div className="grid content-start gap-3"><label className="editor-field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as StayBookingStatus)}>{Object.entries(stayBookingStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="editor-field"><span>Notatka dla obsługi</span><textarea rows={5} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label><Button onClick={() => void save()} disabled={working}><Check className="size-4" /> {working ? "Zapisuję…" : "Zapisz"}</Button>{message ? <p className="text-sm text-orange-100">{message}</p> : null}</div></article>;
}
