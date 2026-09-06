// biome-ignore-all lint/a11y/noLabelWithoutControl: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import { OptimizedImage } from "cstd-next/media/image/optimized-image.jsx";
import { LoaderCircle, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useEditor } from "@/components/editor/editor-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { appendOptimizedImage } from "@/lib/client-image-upload";
import type { BookableEquipment, WeatherProfile } from "@/lib/reservations";
import { cn } from "@/lib/utils";
import { weatherProfileLabel } from "@/lib/wind-recommendations";

type EquipmentForm = Omit<BookableEquipment, "id" | "image" | "professionalWindMinKmh"> & { active: boolean; professionalWindMinKmh: number | "" };

export function EquipmentEditor({ equipment, compact = false, className }: { equipment?: BookableEquipment; compact?: boolean; className?: string }) {
	const { enabled, visible } = useEditor();
	const router = useRouter();
	const initial = equipment ? toForm(equipment) : emptyForm();
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [errors, setErrors] = useState<string[]>([]);
	const draftKey = `showteam:visual-equipment:${equipment?.id ?? "new"}`;

	useEffect(() => {
		if (!open) {
			return;
		}
		const obscuringElements = [...document.querySelectorAll<HTMLElement>(".site-header, .page-content-savebar, .editor-toolbar, .editor-action")];
		const previousVisibility = obscuringElements.map((element) => element.style.visibility);
		obscuringElements.forEach((element) => {
			element.style.visibility = "hidden";
		});
		return () =>
			obscuringElements.forEach((element, index) => {
				element.style.visibility = previousVisibility[index];
			});
	}, [open]);

	if (!enabled || !visible) {
		return null;
	}

	function openChanged(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			return;
		}
		const saved = localStorage.getItem(draftKey);
		if (!saved) {
			return;
		}
		try {
			setValue(JSON.parse(saved) as EquipmentForm);
		} catch {
			localStorage.removeItem(draftKey);
		}
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
		const result = (await response.json()) as { message?: string; errors?: string[] };
		setSaving(false);
		setMessage(result.message ?? null);
		setErrors(result.errors ?? []);
		if (response.ok) {
			localStorage.removeItem(draftKey);
			router.refresh();
		}
	}

	async function replaceImage(file: File | undefined) {
		if (!file || !equipment || saving) {
			return;
		}
		setSaving(true);
		setMessage("Przygotowuję zdjęcie…");
		setErrors([]);
		try {
			const body = new FormData();
			await appendOptimizedImage(body, file, "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw");
			const response = await fetch(`/api/admin/equipment/${equipment.id}/image`, { method: "POST", body });
			const result = (await response.json()) as { message?: string };
			if (!response.ok) {
				throw new Error(result.message || "Nie udało się zmienić zdjęcia.");
			}
			setMessage(result.message || "Zdjęcie zostało zmienione.");
			router.refresh();
		} catch (caught) {
			setMessage(null);
			setErrors([caught instanceof Error ? caught.message : "Nie udało się zmienić zdjęcia."]);
		} finally {
			setSaving(false);
		}
	}

	async function remove() {
		if (!equipment || !window.confirm(`Usunąć „${equipment.name}”? Tej operacji nie można cofnąć.`)) {
			return;
		}
		setSaving(true);
		const response = await fetch(`/api/admin/equipment/${equipment.id}`, { method: "DELETE" });
		const result = (await response.json()) as { message?: string };
		setSaving(false);
		if (!response.ok) {
			setErrors([result.message || "Nie udało się usunąć aktywności."]);
			return;
		}
		localStorage.removeItem(draftKey);
		router.refresh();
	}

	const label = equipment ? `Edytuj ${equipment.name}` : "Dodaj aktywność";
	return (
		<Sheet onOpenChange={openChanged}>
			<SheetTrigger render={<button type="button" className={cn("editor-action", compact && "min-h-10 px-3", className)} />}>
				{equipment ? <Pencil className="size-4" /> : <Plus className="size-4" />}
				{compact ? <span className="sr-only">{label}</span> : label}
			</SheetTrigger>
			<SheetContent
				title={label}
				description="Zarządzaj aktywnościami widocznymi w rezerwacjach."
				className="isolate overflow-y-auto overscroll-contain sm:left-auto sm:w-[min(42rem,100vw)]"
			>
				<form onSubmit={save} className="min-h-full px-5 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8">
					<span className="eyebrow">Rezerwacje</span>
					<h2 className="mt-3 font-black font-display text-4xl uppercase leading-none">{label}</h2>
					<p className="mt-3 text-sm text-white/55 leading-6">To, co zapiszesz tutaj, od razu trafi do wyboru aktywności i dostępnych godzin.</p>
					{equipment ? (
						<div className="mt-6 grid gap-3 sm:grid-cols-2">
							{typeof equipment.image === "object" && equipment.image?.optimizedImage ? (
								<div className="relative aspect-video overflow-hidden bg-neutral-900">
									<OptimizedImage
										src={equipment.image.optimizedImage}
										alt={equipment.image.alt || equipment.name}
										loading="lazy"
										sizes="(min-width: 640px) 50vw, 100vw"
										className="absolute inset-0 size-full object-cover"
									/>
								</div>
							) : (
								<div className="grid aspect-video place-items-center border border-white/15 border-dashed text-sm text-white/35">Brak zdjęcia</div>
							)}
							<label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-orange-500/60 px-4 text-center font-bold text-sm">
								<RefreshCw className="size-4" />
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/avif"
									className="sr-only"
									disabled={saving}
									onChange={(event) => void replaceImage(event.target.files?.[0])}
								/>
								Zmień zdjęcie aktywności
							</label>
						</div>
					) : null}

					<EditorSection title="1. Aktywność" description="Informacje widoczne dla klienta.">
						<Field label="Nazwa aktywności">
							<input required={true} maxLength={120} value={value.name} onChange={(event) => update("name", event.target.value)} />
						</Field>
						<Field label="Krótki opis">
							<textarea
								required={true}
								minLength={10}
								maxLength={300}
								rows={4}
								value={value.description}
								onChange={(event) => update("description", event.target.value)}
							/>
							<small>{value.description.length}/300</small>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Kategoria">
								<select value={value.category} onChange={(event) => update("category", event.target.value)}>
									{["Woda", "Ląd", "Szkolenie", "Inne"].map((category) => (
										<option key={category}>{category}</option>
									))}
								</select>
							</Field>
							<Field label="Liczba miejsc lub sztuk">
								<input required={true} type="number" min={1} max={99} value={value.quantity} onChange={(event) => update("quantity", event.target.valueAsNumber)} />
							</Field>
						</div>
						<Field label="Ważna informacja" hint="Opcjonalnie, np. wymagane uprawnienia.">
							<textarea maxLength={220} rows={3} value={value.notice ?? ""} onChange={(event) => update("notice", event.target.value)} />
						</Field>
						<label className="flex min-h-12 items-center gap-3 border border-white/15 p-3 font-semibold">
							<input type="checkbox" checked={value.active} onChange={(event) => update("active", event.target.checked)} className="size-5 accent-orange-500" /> Klienci
							mogą rezerwować tę aktywność
						</label>
						<label className="flex min-h-12 items-center gap-3 border border-white/15 p-3 font-semibold">
							<input
								type="checkbox"
								checked={value.unavailableWeekends}
								onChange={(event) => update("unavailableWeekends", event.target.checked)}
								className="size-5 accent-orange-500"
							/>{" "}
							Niedostępna w soboty i niedziele
						</label>
						<div className="grid grid-cols-2 gap-3">
							<Button type="button" variant="outline" onClick={() => update("sortOrder", 0)}>
								Przenieś na początek
							</Button>
							<Button type="button" variant="outline" onClick={() => update("sortOrder", Date.now())}>
								Przenieś na koniec
							</Button>
						</div>
					</EditorSection>

					<EditorSection title="2. Rezerwacja" description="Wspólne godziny bazy: 10:00–20:00, od maja do końca października.">
						<Field label="Długość rezerwacji w minutach">
							<input
								required={true}
								type="number"
								min={60}
								max={720}
								step={15}
								value={value.durationMinutes}
								onChange={(event) => update("durationMinutes", event.target.valueAsNumber)}
							/>
						</Field>
					</EditorSection>

					<EditorSection title="3. Polecane warunki" description="Podpowiedzi pogodowe pokazywane przy godzinach.">
						<Field label="Najlepsza pogoda">
							<select value={value.weatherProfile} onChange={(event) => update("weatherProfile", event.target.value as WeatherProfile)}>
								<option value="any">Pogoda bez znaczenia</option>
								<option value="calm">Najlepiej bez wiatru</option>
								<option value="wind">Najlepiej z wiatrem</option>
							</select>
						</Field>
						<p className="border-sky-400 border-l-2 pl-3 text-white/50 text-xs leading-5">{weatherProfileLabel(value.weatherProfile)}</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Pierwsze polecane okno — od">
								<input type="time" value={value.recommendedStart1 ?? ""} onChange={(event) => update("recommendedStart1", event.target.value)} />
							</Field>
							<Field label="Do">
								<input type="time" value={value.recommendedEnd1 ?? ""} onChange={(event) => update("recommendedEnd1", event.target.value)} />
							</Field>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Drugie polecane okno — od">
								<input type="time" value={value.recommendedStart2 ?? ""} onChange={(event) => update("recommendedStart2", event.target.value)} />
							</Field>
							<Field label="Do">
								<input type="time" value={value.recommendedEnd2 ?? ""} onChange={(event) => update("recommendedEnd2", event.target.value)} />
							</Field>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Średni warun od km/h">
								<input type="number" min={0} max={100} value={value.windMediumMinKmh} onChange={(event) => update("windMediumMinKmh", event.target.valueAsNumber)} />
							</Field>
							<Field label="Średni warun do km/h">
								<input type="number" min={0} max={100} value={value.windMediumMaxKmh} onChange={(event) => update("windMediumMaxKmh", event.target.valueAsNumber)} />
							</Field>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Najlepszy warun od km/h">
								<input type="number" min={0} max={100} value={value.windBestMinKmh} onChange={(event) => update("windBestMinKmh", event.target.valueAsNumber)} />
							</Field>
							<Field label="Najlepszy warun do km/h">
								<input type="number" min={0} max={100} value={value.windBestMaxKmh} onChange={(event) => update("windBestMaxKmh", event.target.valueAsNumber)} />
							</Field>
						</div>
						{value.weatherProfile === "wind" && (
							<Field label="Warun profesjonalny od km/h" hint="Opcjonalnie. Zostaw puste, aby wyłączyć.">
								<input
									type="number"
									min={0}
									max={100}
									value={value.professionalWindMinKmh}
									onChange={(event) => update("professionalWindMinKmh", event.target.value ? event.target.valueAsNumber : "")}
								/>
							</Field>
						)}
						<Field label="Dodatkowa podpowiedź" hint="Opcjonalnie.">
							<textarea maxLength={220} rows={3} value={value.recommendationNote ?? ""} onChange={(event) => update("recommendationNote", event.target.value)} />
						</Field>
					</EditorSection>

					{equipment ? (
						<div className="mt-8 border-white/15 border-t pt-6">
							<Button
								type="button"
								variant="outline"
								className="w-full border-red-500/40 text-red-200 hover:bg-red-500 hover:text-white sm:w-auto"
								onClick={() => void remove()}
								disabled={saving}
							>
								<Trash2 className="size-4" /> Usuń aktywność
							</Button>
						</div>
					) : null}
					{(message || errors.length > 0) && (
						<div
							className={`mt-6 border p-4 text-sm ${errors.length > 0 || message?.startsWith("Nie udało") ? "border-red-400/50 bg-red-950/50 text-red-100" : "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"}`}
							role="status"
						>
							<p className="font-bold">{message}</p>
							{errors.length > 0 && (
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{errors.map((error) => (
										<li key={error}>{error}</li>
									))}
								</ul>
							)}
						</div>
					)}
					<div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-white/15 border-t bg-neutral-950 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-1rem_2rem_rgba(0,0,0,.45)] sm:left-auto sm:w-[min(42rem,100vw)] sm:px-8">
						<Button type="button" variant="outline" onClick={clear}>
							<RotateCcw className="size-4" /> Cofnij
						</Button>
						<Button type="submit" className="flex-1" disabled={saving}>
							{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
							{saving ? "Zapisuję…" : equipment ? "Zapisz zmiany" : "Dodaj aktywność"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
	return (
		<section className="mt-8 border-white/15 border-t pt-6">
			<h3 className="font-black font-display text-2xl uppercase">{title}</h3>
			<p className="mt-1 text-white/45 text-xs">{description}</p>
			<div className="mt-5 grid gap-5">{children}</div>
		</section>
	);
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<label className="editor-field">
			<span>{label}</span>
			{children}
			{hint && <small>{hint}</small>}
		</label>
	);
}

function toForm(item: BookableEquipment): EquipmentForm {
	return {
		...item,
		notice: item.notice ?? "",
		recommendedStart1: item.recommendedStart1 ?? "",
		recommendedEnd1: item.recommendedEnd1 ?? "",
		recommendedStart2: item.recommendedStart2 ?? "",
		recommendedEnd2: item.recommendedEnd2 ?? "",
		professionalWindMinKmh: item.professionalWindMinKmh ?? "",
		recommendationNote: item.recommendationNote ?? "",
		active: true,
	};
}

function emptyForm(): EquipmentForm {
	return {
		name: "",
		description: "",
		category: "Woda",
		quantity: 1,
		durationMinutes: 60,
		openTime: "10:00",
		closeTime: "20:00",
		unavailableWeekends: false,
		notice: "",
		active: true,
		weatherProfile: "any",
		recommendedStart1: "",
		recommendedEnd1: "",
		recommendedStart2: "",
		recommendedEnd2: "",
		windMediumMinKmh: 0,
		windMediumMaxKmh: 100,
		windBestMinKmh: 0,
		windBestMaxKmh: 100,
		professionalWindMinKmh: "",
		recommendationNote: "",
		sortOrder: Date.now(),
	};
}
