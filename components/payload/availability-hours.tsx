"use client";

import { CalendarClock, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Equipment = { id: number; name: string };
type HoursRule = {
  id: string;
  equipment_id: number | null;
  equipment_name: string;
  rule_type: "date" | "weekly";
  booking_date: string | null;
  weekdays: string | null;
  start_time: string;
  end_time: string;
  name: string | null;
  created_at: number;
};

const days = [
  [1, "Pon"], [2, "Wt"], [3, "Śr"], [4, "Czw"], [5, "Pt"], [6, "Sob"], [0, "Nd"],
] as const;

function ruleTarget(rule: HoursRule): string {
  if (rule.rule_type === "date") return rule.booking_date || "";
  const selected = new Set((rule.weekdays || "").split(",").map(Number));
  return days.filter(([value]) => selected.has(value)).map(([, label]) => label).join(", ");
}

export function AvailabilityHours({ onChange, selectedEquipmentId }: { onChange: () => void; selectedEquipmentId?: number }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rules, setRules] = useState<HoursRule[]>([]);
  const [ruleType, setRuleType] = useState<"date" | "weekly">("date");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/availability-hours", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { equipment?: Equipment[]; rules?: HoursRule[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać godzin.");
        setEquipment(body.equipment || []);
        setRules(body.rules || []);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking(true);
    setError("");
    const response = await fetch("/api/admin/availability-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipmentId: form.get("equipmentId"),
        ruleType,
        bookingDate: form.get("bookingDate"),
        weekdays: form.getAll("weekdays"),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        name: form.get("name"),
      }),
    });
    const body = await response.json() as HoursRule & { error?: string };
    setWorking(false);
    if (!response.ok) return setError(body.error || "Nie udało się zapisać godzin.");
    setRules((current) => [body, ...current.filter((item) => !(item.rule_type === body.rule_type && item.equipment_id === body.equipment_id && (body.rule_type === "date" ? item.booking_date === body.booking_date : item.weekdays === body.weekdays)))]);
    onChange();
  }

  async function removeRule(rule: HoursRule) {
    if (!window.confirm(`Usunąć godziny: ${ruleTarget(rule)}, ${rule.start_time}–${rule.end_time}?`)) return;
    setError("");
    const response = await fetch("/api/admin/availability-hours", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rule.id }) });
    if (!response.ok) return setError("Nie udało się usunąć reguły. Spróbuj ponownie.");
    setRules((current) => current.filter((item) => item.id !== rule.id));
    onChange();
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  return <section className="availability-hours">
    <div className="availability-hours__intro">
      <span>GODZINY WYNAJMU</span>
      <h2>Ustaw godziny na dzień lub szablon</h2>
      <p>Wyjątek konkretnej daty ma pierwszeństwo przed szablonem tygodniowym.</p>
    </div>
    <div className="availability-hours__modes" role="tablist" aria-label="Rodzaj godzin">
      <button type="button" role="tab" aria-selected={ruleType === "date"} onClick={() => setRuleType("date")}>Konkretny dzień</button>
      <button type="button" role="tab" aria-selected={ruleType === "weekly"} onClick={() => setRuleType("weekly")}>Szablon tygodnia</button>
    </div>
    <form onSubmit={(event) => void saveRule(event)}>
      <label><span>Dla czego?</span><select name="equipmentId" defaultValue={selectedEquipmentId ? String(selectedEquipmentId) : "all"}><option value="all">Wszystkie sprzęty</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {ruleType === "date"
        ? <label><span>Data</span><input required name="bookingDate" type="date" min={today} defaultValue={today} /></label>
        : <fieldset><legend>Dni tygodnia</legend><div>{days.map(([value, label]) => <label key={value}><input type="checkbox" name="weekdays" value={value} defaultChecked={value === 6 || value === 0} /><span>{label}</span></label>)}</div></fieldset>}
      <label><span>Start</span><input required name="startTime" type="time" defaultValue="09:00" /></label>
      <label><span>Koniec</span><input required name="endTime" type="time" defaultValue="18:00" /></label>
      <label><span>Nazwa <small>(opcjonalnie)</small></span><input name="name" maxLength={80} placeholder={ruleType === "weekly" ? "Np. Weekend" : "Np. Dłuższa sobota"} /></label>
      <button type="submit" disabled={loading || working}><CalendarClock aria-hidden="true" />{working ? "Zapisuję…" : "Zapisz godziny"}</button>
    </form>
    {loading ? <p className="availability-hours__status"><RefreshCw aria-hidden="true" /> Ładuję godziny…</p> : null}
    {error ? <p className="availability-hours__error" role="alert">{error}</p> : null}
    {rules.length ? <div className="availability-hours__list"><h3>Aktywne wyjątki i szablony</h3>{rules.map((rule) => <article key={rule.id}><div><strong>{rule.name || (rule.rule_type === "date" ? "Wyjątek dnia" : "Szablon tygodniowy")} · {rule.start_time}–{rule.end_time}</strong><p>{rule.equipment_name} · {ruleTarget(rule)}</p></div><button type="button" onClick={() => void removeRule(rule)}><Trash2 aria-hidden="true" /> Usuń</button></article>)}</div> : !loading ? <p className="availability-hours__empty">Brak dodatkowych reguł — obowiązują standardowe godziny sprzętu.</p> : null}
  </section>;
}
