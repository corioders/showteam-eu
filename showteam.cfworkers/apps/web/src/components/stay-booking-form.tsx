"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
			<Alert className="border-emerald-400/30 bg-emerald-400/[.06] p-8 text-center sm:p-12">
				<CheckCircle2 className="mx-auto size-12 text-emerald-300" />
				<AlertTitle className="mt-5 font-black font-display text-5xl uppercase">Rezerwacja zapisana</AlertTitle>
				<AlertDescription className="mt-4 text-white/65">
					Asia potwierdzi dostępność i skontaktuje się z Tobą. Numer: <strong>{reference}</strong>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<form onSubmit={(event) => void submit(event)} noValidate={true}>
			<FieldGroup>
				<FieldSet>
					<FieldLegend className="font-black font-display text-3xl uppercase">Co rezerwujesz?</FieldLegend>
					<FieldGroup className="grid gap-3 sm:grid-cols-2">
						{["Kontener mieszkalny", "Domek holenderski"].map((type) => (
							<FieldLabel
								key={type}
								className={`flex min-h-16 w-full cursor-pointer items-center gap-3 border p-4 font-bold ${value.accommodationTypes.includes(type) ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}
							>
								<Checkbox checked={value.accommodationTypes.includes(type)} onCheckedChange={() => toggle(type)} />
								<span>{type}</span>
							</FieldLabel>
						))}
					</FieldGroup>
				</FieldSet>

				<FieldGroup className="grid gap-5 sm:grid-cols-3">
					<Field>
						<FieldLabel htmlFor="stay-check-in">Przyjazd</FieldLabel>
						<Input id="stay-check-in" required={true} type="date" min={today} value={value.checkIn} onChange={(event) => update("checkIn", event.target.value)} />
					</Field>
					<Field>
						<FieldLabel htmlFor="stay-check-out">Wyjazd</FieldLabel>
						<Input
							id="stay-check-out"
							required={true}
							type="date"
							min={value.checkIn || today}
							value={value.checkOut}
							onChange={(event) => update("checkOut", event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="stay-guests">Liczba gości</FieldLabel>
						<Input
							id="stay-guests"
							required={true}
							type="number"
							min={1}
							max={100}
							value={value.guests}
							onChange={(event) => update("guests", event.target.valueAsNumber)}
						/>
					</Field>
				</FieldGroup>

				<FieldGroup className="grid gap-5 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="stay-name">Imię i nazwisko</FieldLabel>
						<Input id="stay-name" required={true} autoComplete="name" value={value.customerName} onChange={(event) => update("customerName", event.target.value)} />
					</Field>
					<Field>
						<FieldLabel htmlFor="stay-phone">Telefon</FieldLabel>
						<Input id="stay-phone" required={true} type="tel" autoComplete="tel" value={value.phone} onChange={(event) => update("phone", event.target.value)} />
					</Field>
					<Field>
						<FieldLabel htmlFor="stay-email">E-mail</FieldLabel>
						<Input id="stay-email" required={true} type="email" autoComplete="email" value={value.email} onChange={(event) => update("email", event.target.value)} />
					</Field>
					<Field>
						<FieldLabel htmlFor="stay-notes">Uwagi (opcjonalnie)</FieldLabel>
						<Textarea id="stay-notes" rows={4} maxLength={2000} value={value.notes} onChange={(event) => update("notes", event.target.value)} />
					</Field>
				</FieldGroup>

				<Field orientation="horizontal" className="border border-white/15 p-4">
					<Checkbox id="stay-privacy" required={true} checked={value.privacyConsent} onCheckedChange={(checked) => update("privacyConsent", checked)} />
					<FieldLabel htmlFor="stay-privacy">Wyrażam zgodę na kontakt i przetwarzanie danych w celu obsługi rezerwacji noclegu.</FieldLabel>
				</Field>

				{error ? (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}

				<Button type="submit" size="lg" disabled={working}>
					<Send data-icon="inline-start" /> {working ? "Wysyłam…" : "Zarezerwuj pobyt"}
				</Button>
			</FieldGroup>
		</form>
	);
}
