// biome-ignore-all lint/a11y/noLabelWithoutControl: Legacy SHOWteam behavior is preserved during the structural template migration.
"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function StayBookingForm({ today }: { today: string }) {
	const [value, setValue] = useState({
		accommodationTypes: [] as string[],
		checkIn: "",
		checkOut: "",
		guests: 1,
		customerName: "",
		phone: "",
		email: "",
		notes: "",
		privacyConsent: false,
	});
	const [working, setWorking] = useState(false);
	const [error, setError] = useState("");
	const [reference, setReference] = useState("");
	function update<K extends keyof typeof value>(field: K, next: (typeof value)[K]) {
		setValue((current) => ({ ...current, [field]: next }));
		setError("");
	}
	function toggle(type: string) {
		update(
			"accommodationTypes",
			value.accommodationTypes.includes(type) ? value.accommodationTypes.filter((item) => item !== type) : [...value.accommodationTypes, type],
		);
	}
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setWorking(true);
		setError("");
		const response = await fetch("/api/stay-bookings", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...value, website: "" }),
		});
		const body = (await response.json()) as { reference?: string; error?: string };
		setWorking(false);
		if (!response.ok || !body.reference) {
			return setError(body.error || "Nie udało się wysłać rezerwacji.");
		}
		setReference(body.reference);
	}
	if (reference) {
		return (
			<div className="border border-emerald-400/30 bg-emerald-400/[.06] p-8 text-center sm:p-12">
				<CheckCircle2 className="mx-auto size-12 text-emerald-300" />
				<h2 className="mt-5 font-black font-display text-5xl uppercase">Rezerwacja zapisana</h2>
				<p className="mt-4 text-white/65">
					Asia potwierdzi dostępność i skontaktuje się z Tobą. Numer: <strong>{reference}</strong>
				</p>
			</div>
		);
	}
	return (
		<form onSubmit={(event) => void submit(event)} className="grid gap-7" noValidate={true}>
			<fieldset>
				<legend className="font-black font-display text-3xl uppercase">Co rezerwujesz?</legend>
				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					{["Kontener mieszkalny", "Domek holenderski"].map((type) => (
						<label
							key={type}
							className={`flex min-h-16 cursor-pointer items-center gap-3 border p-4 font-bold ${value.accommodationTypes.includes(type) ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}
						>
							<input type="checkbox" checked={value.accommodationTypes.includes(type)} onChange={() => toggle(type)} className="size-5" />
							{type}
						</label>
					))}
				</div>
			</fieldset>
			<div className="grid gap-5 sm:grid-cols-3">
				<Field label="Przyjazd">
					<input required={true} type="date" min={today} value={value.checkIn} onChange={(event) => update("checkIn", event.target.value)} />
				</Field>
				<Field label="Wyjazd">
					<input required={true} type="date" min={value.checkIn || today} value={value.checkOut} onChange={(event) => update("checkOut", event.target.value)} />
				</Field>
				<Field label="Liczba gości">
					<input required={true} type="number" min={1} max={100} value={value.guests} onChange={(event) => update("guests", event.target.valueAsNumber)} />
				</Field>
			</div>
			<div className="grid gap-5 sm:grid-cols-2">
				<Field label="Imię i nazwisko">
					<input required={true} autoComplete="name" value={value.customerName} onChange={(event) => update("customerName", event.target.value)} />
				</Field>
				<Field label="Telefon">
					<input required={true} type="tel" autoComplete="tel" value={value.phone} onChange={(event) => update("phone", event.target.value)} />
				</Field>
				<Field label="E-mail">
					<input required={true} type="email" autoComplete="email" value={value.email} onChange={(event) => update("email", event.target.value)} />
				</Field>
				<Field label="Uwagi (opcjonalnie)">
					<textarea rows={4} maxLength={2000} value={value.notes} onChange={(event) => update("notes", event.target.value)} />
				</Field>
			</div>
			<label className="flex gap-3 border border-white/15 p-4 text-sm leading-6">
				<input
					required={true}
					type="checkbox"
					checked={value.privacyConsent}
					onChange={(event) => update("privacyConsent", event.target.checked)}
					className="mt-1 size-5 shrink-0 accent-orange-500"
				/>{" "}
				Wyrażam zgodę na kontakt i przetwarzanie danych w celu obsługi rezerwacji noclegu.
			</label>
			{error ? (
				<p className="border border-red-500/40 bg-red-500/10 p-4 text-red-100" role="alert">
					{error}
				</p>
			) : null}
			<Button type="submit" size="lg" disabled={working}>
				<Send className="size-4" /> {working ? "Wysyłam…" : "Zarezerwuj pobyt"}
			</Button>
		</form>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="editor-field">
			<span>{label}</span>
			{children}
		</label>
	);
}
