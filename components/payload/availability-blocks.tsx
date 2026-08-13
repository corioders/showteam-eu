"use client";

import { Ban, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Equipment = { id: number; name: string };
type AvailabilityBlock = {
  id: string;
  equipment_id: number | null;
  equipment_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: number;
};

export function AvailabilityBlocks({ onChange }: { onChange: () => void }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/availability-blocks", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { equipment?: Equipment[]; blocks?: AvailabilityBlock[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać blokad.");
        setEquipment(body.equipment || []);
        setBlocks(body.blocks || []);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function createBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setWorking(true);
    setError("");
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/availability-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = await response.json() as AvailabilityBlock & { error?: string };
    setWorking(false);
    if (!response.ok) return setError(body.error || "Nie udało się zablokować terminu.");
    setBlocks((current) => [...current, body].sort((a, b) => `${a.booking_date}${a.start_time}`.localeCompare(`${b.booking_date}${b.start_time}`)));
    (formElement.elements.namedItem("reason") as HTMLInputElement).value = "";
    onChange();
  }

  async function removeBlock(block: AvailabilityBlock) {
    if (!window.confirm(`Odblokować ${block.equipment_name}, ${block.booking_date} ${block.start_time}–${block.end_time}?`)) return;
    setError("");
    const response = await fetch("/api/admin/availability-blocks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: block.id }) });
    if (!response.ok) return setError("Nie udało się odblokować terminu. Spróbuj ponownie.");
    setBlocks((current) => current.filter((item) => item.id !== block.id));
    onChange();
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  return <section className="availability-blocks">
    <div className="availability-blocks__intro"><span>BLOKOWANIE TERMINÓW</span><h2>Zamknij termin wynajmu</h2><p>Klienci nie zobaczą zablokowanych godzin. Możesz zablokować jeden sprzęt albo wszystko naraz.</p></div>
    <form onSubmit={(event) => void createBlock(event)}>
      <label><span>Co blokujesz?</span><select name="equipmentId" defaultValue="all"> <option value="all">Wszystkie sprzęty</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span>Data</span><input required name="bookingDate" type="date" min={today} defaultValue={today} /></label>
      <label><span>Od</span><input required name="startTime" type="time" defaultValue="09:00" /></label>
      <label><span>Do</span><input required name="endTime" type="time" defaultValue="10:00" /></label>
      <label className="availability-blocks__reason"><span>Powód <small>(opcjonalnie)</small></span><input name="reason" maxLength={160} placeholder="Np. serwis sprzętu" /></label>
      <button type="submit" disabled={loading || working}><Ban aria-hidden="true" />{working ? "Blokuję…" : "Zablokuj termin"}</button>
    </form>
    {loading ? <p className="availability-blocks__status"><RefreshCw aria-hidden="true" /> Ładuję blokady…</p> : null}
    {error ? <p className="availability-blocks__error" role="alert">{error}</p> : null}
    {blocks.length ? <div className="availability-blocks__list"><h3>Nadchodzące blokady</h3>{blocks.map((block) => <article key={block.id}><div><strong>{block.booking_date} · {block.start_time}–{block.end_time}</strong><p>{block.equipment_name}{block.reason ? ` · ${block.reason}` : ""}</p></div><button type="button" onClick={() => void removeBlock(block)}><Trash2 aria-hidden="true" /> Odblokuj</button></article>)}</div> : !loading ? <p className="availability-blocks__empty">Brak nadchodzących blokad.</p> : null}
  </section>;
}
