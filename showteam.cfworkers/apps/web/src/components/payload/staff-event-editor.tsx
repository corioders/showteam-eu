// biome-ignore-all lint/a11y/noLabelWithoutControl: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import { LoaderCircle, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { StaffEventRecord } from "@/lib/staff-events";

type FormValue = Omit<StaffEventRecord, "id">;

export function StaffEventEditor({
	open,
	selectedDate,
	eventId,
	onClose,
	onSaved,
}: {
	open: boolean;
	selectedDate: string;
	eventId?: string;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [value, setValue] = useState<FormValue>(() => emptyValue(selectedDate));
	const [working, setWorking] = useState(false);
	const [loading, setLoading] = useState(Boolean(eventId));
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (!open || !eventId) {
			return;
		}
		const controller = new AbortController();
		fetch(`/api/admin/staff-events?id=${encodeURIComponent(eventId)}`, { cache: "no-store", signal: controller.signal })
			.then(async (response) => {
				const body = (await response.json()) as { event?: StaffEventRecord; error?: string };
				if (!response.ok) {
					throw new Error(body.error || "Nie udało się pobrać wydarzenia.");
				}
				const event = body.event;
				if (!event) {
					throw new Error("Nie znaleziono wydarzenia.");
				}
				setValue({
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					startTime: event.startTime,
					endTime: event.endTime,
					allDay: event.allDay,
					blocksBase: event.blocksBase,
					notes: event.notes,
					recurrence: event.recurrence,
					recurrenceUntil: event.recurrenceUntil,
				});
			})
			.catch((requestError) => {
				if (requestError.name !== "AbortError") {
					setError(requestError.message);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			});
		return () => controller.abort();
	}, [eventId, open]);

	function update<K extends keyof FormValue>(field: K, next: FormValue[K]) {
		setValue((current) => ({ ...current, [field]: next }));
		setError("");
		setMessage("");
	}

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setWorking(true);
		setError("");
		const response = await fetch("/api/admin/staff-events", {
			method: eventId ? "PATCH" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...value, id: eventId }),
		});
		const body = (await response.json()) as { error?: string; conflictingBookings?: number };
		setWorking(false);
		if (!response.ok) {
			return setError(body.error || "Nie udało się zapisać wydarzenia.");
		}
		setMessage(
			body.conflictingBookings
				? `Wydarzenie zapisane. ${body.conflictingBookings} ${body.conflictingBookings === 1 ? "rezerwacja wymaga" : "rezerwacje wymagają"} kontaktu z klientem.`
				: "Wydarzenie zapisane w kalendarzu.",
		);
		onSaved();
	}

	async function remove() {
		if (!eventId || !window.confirm("Usunąć to wydarzenie z kalendarza?")) {
			return;
		}
		setWorking(true);
		const response = await fetch("/api/admin/staff-events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: eventId }) });
		setWorking(false);
		if (!response.ok) {
			return setError("Nie udało się usunąć wydarzenia.");
		}
		onSaved();
		onClose();
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
		>
			<SheetContent
				title={eventId ? "Edytuj wydarzenie" : "Dodaj wydarzenie"}
				description="Prywatne wydarzenie kadry w kalendarzu bazy."
				className="overflow-y-auto sm:left-auto sm:w-[min(42rem,100vw)]"
			>
				<form
					onSubmit={(event) => void save(event)}
					className="min-h-full px-5 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8"
				>
					<span className="eyebrow">Kalendarz kadry</span>
					<h2 className="mt-3 font-black font-display text-4xl uppercase leading-none">{eventId ? "Edytuj wydarzenie" : "Dodaj wydarzenie"}</h2>
					<p className="mt-3 text-sm text-white/55 leading-6">Opis widzi tylko kadra. Klient zobaczy wyłącznie, że termin jest niedostępny.</p>
					{loading ? (
						<p className="mt-8 flex items-center gap-2 text-white/60">
							<LoaderCircle className="size-4 animate-spin" /> Ładuję wydarzenie…
						</p>
					) : (
						<div className="mt-8 grid gap-5">
							<Field label="Nazwa wydarzenia">
								<input required={true} minLength={2} maxLength={120} value={value.title} onChange={(event) => update("title", event.target.value)} />
							</Field>
							<div className="grid gap-4 sm:grid-cols-2">
								<Field label="Data rozpoczęcia">
									<input required={true} type="date" value={value.startDate} onChange={(event) => update("startDate", event.target.value)} />
								</Field>
								<Field label="Data zakończenia" hint="Opcjonalna — zostaw pustą dla jednego dnia.">
									<input type="date" min={value.startDate} value={value.endDate || ""} onChange={(event) => update("endDate", event.target.value || null)} />
								</Field>
							</div>
							<label className="flex min-h-14 items-center gap-3 border border-white/15 p-4 font-bold">
								<input type="checkbox" checked={value.allDay} onChange={(event) => update("allDay", event.target.checked)} className="size-5 accent-orange-500" /> Cały
								dzień
							</label>
							{!value.allDay ? (
								<div className="grid gap-4 sm:grid-cols-2">
									<Field label="Godzina rozpoczęcia">
										<input required={true} type="time" value={value.startTime || ""} onChange={(event) => update("startTime", event.target.value || null)} />
									</Field>
									<Field label="Godzina zakończenia" hint={value.blocksBase ? "Wymagana, gdy wydarzenie blokuje bazę." : "Opcjonalna."}>
										<input type="time" required={value.blocksBase} value={value.endTime || ""} onChange={(event) => update("endTime", event.target.value || null)} />
									</Field>
								</div>
							) : null}
							<label className="flex min-h-14 items-center gap-3 border border-red-500/35 bg-red-500/[.06] p-4 font-bold">
								<input type="checkbox" checked={value.blocksBase} onChange={(event) => update("blocksBase", event.target.checked)} className="size-5 accent-orange-500" />{" "}
								Blokuje rezerwacje całej bazy
							</label>
							<label className="flex min-h-14 items-center gap-3 border border-white/15 p-4 font-bold">
								<input
									type="checkbox"
									checked={value.recurrence === "weekly"}
									onChange={(event) => update("recurrence", event.target.checked ? "weekly" : "none")}
									className="size-5 accent-orange-500"
								/>{" "}
								Powtarzaj co tydzień
							</label>
							{value.recurrence === "weekly" ? (
								<Field label="Powtarzaj do">
									<input
										required={true}
										type="date"
										min={value.endDate || value.startDate}
										value={value.recurrenceUntil || ""}
										onChange={(event) => update("recurrenceUntil", event.target.value || null)}
									/>
								</Field>
							) : null}
							<Field label="Prywatny opis dla kadry">
								<textarea rows={5} maxLength={1000} value={value.notes || ""} onChange={(event) => update("notes", event.target.value || null)} />
							</Field>
							{error ? (
								<p className="border border-red-500/40 bg-red-500/10 p-3 text-red-200 text-sm" role="alert">
									{error}
								</p>
							) : null}
							{message ? (
								<p className="border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-100 text-sm" role="status">
									{message}
								</p>
							) : null}
							{eventId ? (
								<Button type="button" variant="outline" className="border-red-500/40 text-red-200" onClick={() => void remove()} disabled={working}>
									<Trash2 className="size-4" /> Usuń wydarzenie
								</Button>
							) : null}
						</div>
					)}
					<div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-white/15 border-t bg-neutral-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:left-auto sm:w-[min(42rem,100vw)] sm:px-8">
						<Button type="button" variant="outline" onClick={() => setValue(emptyValue(selectedDate))}>
							<RotateCcw className="size-4" /> Wyczyść
						</Button>
						<Button type="submit" className="flex-1" disabled={working || loading}>
							{working ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
							{working ? "Zapisuję…" : "Zapisz wydarzenie"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}

function emptyValue(date: string): FormValue {
	return {
		title: "",
		startDate: date,
		endDate: null,
		startTime: "15:00",
		endTime: "16:00",
		allDay: true,
		blocksBase: true,
		notes: null,
		recurrence: "none",
		recurrenceUntil: null,
	};
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<label className="editor-field">
			<span>{label}</span>
			{children}
			{hint ? <small>{hint}</small> : null}
		</label>
	);
}
