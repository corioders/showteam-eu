"use client";

import { Check, RefreshCw, Save, Wind } from "lucide-react";
import { useEffect, useState } from "react";

type Profile = "any" | "calm" | "wind";
type EquipmentRecommendation = {
  id: number;
  name: string;
  weatherProfile: Profile;
  recommendedStart1: string;
  recommendedEnd1: string;
  recommendedStart2: string;
  recommendedEnd2: string;
  recommendationNote: string;
};

const profileHelp: Record<Profile, string> = {
  calm: "SUP, kajak i wake — system poleca godziny z małym wiatrem.",
  wind: "Katamaran, żagle i windsurfing — system poleca godziny z wiatrem.",
  any: "Pogoda nie wpływa na oznaczenie polecanych godzin.",
};

export function EquipmentRecommendations() {
  const [equipment, setEquipment] = useState<EquipmentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/recommendations", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { equipment?: EquipmentRecommendation[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać ustawień.");
        setEquipment(body.equipment || []);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function change(id: number, field: keyof EquipmentRecommendation, value: string) {
    setSavedId(null);
    setEquipment((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function save(item: EquipmentRecommendation) {
    setSavingId(item.id);
    setSavedId(null);
    setError("");
    const response = await fetch("/api/admin/recommendations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    const body = await response.json() as { error?: string };
    setSavingId(null);
    if (!response.ok) return setError(body.error || "Nie udało się zapisać.");
    setSavedId(item.id);
  }

  return <section className="equipment-recommendations">
    <header><span>POLECANE GODZINY</span><h2>Co działa przy jakim warunie?</h2><p>Ustaw typowe godziny. Dla najbliższych 16 dni system dodatkowo sprawdzi godzinową prognozę wiatru dla Jeziora Łąckiego. To tylko podpowiedzi — niczego nie blokują.</p></header>
    {loading ? <p className="equipment-recommendations__loading"><RefreshCw aria-hidden="true" /> Ładuję sprzęt…</p> : null}
    {error ? <p className="equipment-recommendations__error" role="alert">{error}</p> : null}
    <div className="equipment-recommendations__list">{equipment.map((item) => <article key={item.id}>
      <div className="equipment-recommendations__title"><Wind aria-hidden="true" /><div><h3>{item.name}</h3><p>{profileHelp[item.weatherProfile]}</p></div></div>
      <label><span>Najlepsze warunki</span><select value={item.weatherProfile} onChange={(event) => change(item.id, "weatherProfile", event.target.value)}><option value="calm">Najlepiej bez wiatru</option><option value="wind">Najlepiej z wiatrem</option><option value="any">Pogoda bez znaczenia</option></select></label>
      <fieldset><legend>Typowe polecane godziny</legend><div><label><span>Od</span><input type="time" value={item.recommendedStart1} onChange={(event) => change(item.id, "recommendedStart1", event.target.value)} /></label><label><span>Do</span><input type="time" value={item.recommendedEnd1} onChange={(event) => change(item.id, "recommendedEnd1", event.target.value)} /></label><label><span>Od <small>(drugie okno)</small></span><input type="time" value={item.recommendedStart2} onChange={(event) => change(item.id, "recommendedStart2", event.target.value)} /></label><label><span>Do <small>(drugie okno)</small></span><input type="time" value={item.recommendedEnd2} onChange={(event) => change(item.id, "recommendedEnd2", event.target.value)} /></label></div></fieldset>
      <label><span>Krótka podpowiedź dla klienta <small>(opcjonalnie)</small></span><textarea rows={2} maxLength={220} value={item.recommendationNote} onChange={(event) => change(item.id, "recommendationNote", event.target.value)} placeholder="Np. Rano jezioro jest zwykle najspokojniejsze." /></label>
      <button type="button" disabled={savingId === item.id} onClick={() => void save(item)}>{savedId === item.id ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}{savingId === item.id ? "Zapisuję…" : savedId === item.id ? "Zapisane" : "Zapisz podpowiedzi"}</button>
    </article>)}</div>
    {!loading && !equipment.length ? <p>Brak sprzętu do ustawienia.</p> : null}
    <p className="equipment-recommendations__source">Prognoza wiatru: Open-Meteo · aktualizacja maksymalnie co 30 minut.</p>
  </section>;
}
