"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, RotateCcw, Save } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { BookableEquipment, WeatherProfile } from "@/lib/reservations";
import { cn } from "@/lib/utils";
import { weatherProfileLabel } from "@/lib/wind-recommendations";

type EquipmentForm = Omit<BookableEquipment, "id" | "image" | "professionalWindMinKmh"> & { active: boolean; professionalWindMinKmh: number | "" };

export function EquipmentEditor({ equipment, compact = false, className }: { equipment?: BookableEquipment; compact?: boolean; className?: string }) {
  const { enabled, visible } = useEditor();
  const router = useRouter();
  const initial = equipment ? toForm(equipment) : emptyForm();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const draftKey = `showteam:visual-equipment:${equipment?.id ?? "new"}`;
  if (!enabled || !visible) return null;

  function openChanged(open: boolean) {
    if (!open) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try { setValue(JSON.parse(saved) as EquipmentForm); } catch { localStorage.removeItem(draftKey); }
  }

  function update<K extends keyof EquipmentForm>(field: K, nextValue: EquipmentForm[K]) {
    const next = { ...value, [field]: nextValue };
    setValue(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
    setMessage(null);
    setErrors([]);
  }

  function clear() {
    localStorage.removeItem(draftKey);
    setValue(initial);
    setMessage(null);
    setErrors([]);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors([]);
    const response = await fetch(equipment ? `/api/admin/equipment/${equipment.id}` : "/api/admin/equipment", {
      method: equipment ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const result = await response.json() as { message?: string; errors?: string[] };
    setSaving(false);
    setMessage(result.message ?? null);
    setErrors(result.errors ?? []);
    if (response.ok) {
      localStorage.removeItem(draftKey);
      router.refresh();
    }
  }

  const label = equipment ? `Edytuj ${equipment.name}` : "Dodaj sprzęt";
  return <Sheet onOpenChange={openChanged}>
    <SheetTrigger asChild><button type="button" className={cn("editor-action", compact && "min-h-10 px-3", className)}>{equipment ? <Pencil className="size-4" /> : <Plus className="size-4" />}{compact ? <span className="sr-only">{label}</span> : label}</button></SheetTrigger>
    <SheetContent title={label} description="Zarządzaj sprzętem widocznym w rezerwacjach." className="overflow-y-auto sm:left-auto sm:w-[min(42rem,100vw)]">
      <form onSubmit={save} className="min-h-full px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-8">
        <span className="eyebrow">Rezerwacje</span>
        <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none">{label}</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">To, co zapiszesz tutaj, od razu trafi do wyboru sprzętu i dostępnych godzin.</p>

        <EditorSection title="1. Sprzęt" description="Informacje widoczne dla klienta.">
          <Field label="Nazwa sprzętu"><input required maxLength={120} value={value.name} onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Krótki opis"><textarea required minLength={10} maxLength={300} rows={4} value={value.description} onChange={(event) => update("description", event.target.value)} /><small>{value.description.length}/300</small></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategoria"><select value={value.category} onChange={(event) => update("category", event.target.value)}>{["Woda", "Ląd", "Szkolenie", "Inne"].map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Liczba dostępnych sztuk"><input required type="number" min={1} max={99} value={value.quantity} onChange={(event) => update("quantity", event.target.valueAsNumber)} /></Field>
          </div>
          <Field label="Ważna informacja" hint="Opcjonalnie, np. wymagane uprawnienia."><textarea maxLength={220} rows={3} value={value.notice ?? ""} onChange={(event) => update("notice", event.target.value)} /></Field>
          <label className="flex min-h-12 items-center gap-3 border border-white/15 p-3 font-semibold"><input type="checkbox" checked={value.active} onChange={(event) => update("active", event.target.checked)} className="size-5 accent-orange-500" /> Klienci mogą rezerwować ten sprzęt</label>
        </EditorSection>

        <EditorSection title="2. Godziny" description="Podstawowe godziny i długość jednej rezerwacji.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pierwsza godzina"><input required type="time" value={value.openTime} onChange={(event) => update("openTime", event.target.value)} /></Field>
            <Field label="Koniec rezerwacji"><input required type="time" value={value.closeTime} onChange={(event) => update("closeTime", event.target.value)} /></Field>
          </div>
          <Field label="Długość rezerwacji w minutach"><input required type="number" min={15} max={720} step={15} value={value.durationMinutes} onChange={(event) => update("durationMinutes", event.target.valueAsNumber)} /></Field>
        </EditorSection>

        <EditorSection title="3. Polecane warunki" description="Podpowiedzi pogodowe pokazywane przy godzinach.">
          <Field label="Najlepsza pogoda"><select value={value.weatherProfile} onChange={(event) => update("weatherProfile", event.target.value as WeatherProfile)}><option value="any">Pogoda bez znaczenia</option><option value="calm">Najlepiej bez wiatru</option><option value="wind">Najlepiej z wiatrem</option></select></Field>
          <p className="border-l-2 border-sky-400 pl-3 text-xs leading-5 text-white/50">{weatherProfileLabel(value.weatherProfile)}</p>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Pierwsze polecane okno — od"><input type="time" value={value.recommendedStart1 ?? ""} onChange={(event) => update("recommendedStart1", event.target.value)} /></Field><Field label="Do"><input type="time" value={value.recommendedEnd1 ?? ""} onChange={(event) => update("recommendedEnd1", event.target.value)} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Drugie polecane okno — od"><input type="time" value={value.recommendedStart2 ?? ""} onChange={(event) => update("recommendedStart2", event.target.value)} /></Field><Field label="Do"><input type="time" value={value.recommendedEnd2 ?? ""} onChange={(event) => update("recommendedEnd2", event.target.value)} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Średni warun od km/h"><input type="number" min={0} max={100} value={value.windMediumMinKmh} onChange={(event) => update("windMediumMinKmh", event.target.valueAsNumber)} /></Field><Field label="Średni warun do km/h"><input type="number" min={0} max={100} value={value.windMediumMaxKmh} onChange={(event) => update("windMediumMaxKmh", event.target.valueAsNumber)} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Najlepszy warun od km/h"><input type="number" min={0} max={100} value={value.windBestMinKmh} onChange={(event) => update("windBestMinKmh", event.target.valueAsNumber)} /></Field><Field label="Najlepszy warun do km/h"><input type="number" min={0} max={100} value={value.windBestMaxKmh} onChange={(event) => update("windBestMaxKmh", event.target.valueAsNumber)} /></Field></div>
          {value.weatherProfile === "wind" && <Field label="Warun profesjonalny od km/h" hint="Opcjonalnie. Zostaw puste, aby wyłączyć."><input type="number" min={0} max={100} value={value.professionalWindMinKmh} onChange={(event) => update("professionalWindMinKmh", event.target.value ? event.target.valueAsNumber : "")} /></Field>}
          <Field label="Dodatkowa podpowiedź" hint="Opcjonalnie."><textarea maxLength={220} rows={3} value={value.recommendationNote ?? ""} onChange={(event) => update("recommendationNote", event.target.value)} /></Field>
        </EditorSection>

        <div className="border border-white/15 bg-white/[0.04] p-5" aria-label="Podgląd sprzętu"><span className="eyebrow">Podgląd</span><p className="mt-4 font-display text-4xl font-black uppercase leading-none">{value.name || "Nazwa sprzętu"}</p><p className="mt-3 text-sm leading-6 text-white/60">{value.description || "Opis pojawi się tutaj."}</p><p className="mt-4 text-xs font-bold uppercase text-sky-300">{value.durationMinutes} min · {weatherProfileLabel(value.weatherProfile)}</p></div>
        {(message || errors.length > 0) && <div className={`mt-6 border p-4 text-sm ${errors.length || message?.startsWith("Nie udało") ? "border-red-400/50 bg-red-950/50 text-red-100" : "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"}`} role="status"><p className="font-bold">{message}</p>{errors.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>}
        <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-white/15 bg-neutral-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:left-auto sm:w-[min(42rem,100vw)] sm:px-8"><Button type="button" variant="outline" onClick={clear}><RotateCcw className="size-4" /> Wyczyść</Button><Button type="submit" className="flex-1" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Zapisuję…" : equipment ? "Zapisz zmiany" : "Dodaj sprzęt"}</Button></div>
      </form>
    </SheetContent>
  </Sheet>;
}

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="mt-8 border-t border-white/15 pt-6"><h3 className="font-display text-2xl font-black uppercase">{title}</h3><p className="mt-1 text-xs text-white/45">{description}</p><div className="mt-5 grid gap-5">{children}</div></section>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="editor-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }

function toForm(item: BookableEquipment): EquipmentForm {
  return { ...item, notice: item.notice ?? "", recommendedStart1: item.recommendedStart1 ?? "", recommendedEnd1: item.recommendedEnd1 ?? "", recommendedStart2: item.recommendedStart2 ?? "", recommendedEnd2: item.recommendedEnd2 ?? "", professionalWindMinKmh: item.professionalWindMinKmh ?? "", recommendationNote: item.recommendationNote ?? "", active: true };
}

function emptyForm(): EquipmentForm {
  return { name: "", description: "", category: "Woda", quantity: 1, durationMinutes: 60, openTime: "09:00", closeTime: "19:00", notice: "", active: true, weatherProfile: "any", recommendedStart1: "", recommendedEnd1: "", recommendedStart2: "", recommendedEnd2: "", windMediumMinKmh: 0, windMediumMaxKmh: 100, windBestMinKmh: 0, windBestMaxKmh: 100, professionalWindMinKmh: "", recommendationNote: "" };
}
