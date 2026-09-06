// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import { Check, Mail, Phone } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type StayBookingStatus, stayBookingStatusLabels } from "@/lib/stay-bookings";

type Booking = {
	id: number;
	reference: string;
	status: StayBookingStatus;
	staffNotes?: string | null;
	accommodationTypes: string[];
	checkIn: string;
	checkOut: string;
	guests: number;
	customerName: string;
	phone: string;
	email: string;
	customerNotes?: string | null;
};

export function StayBookingsAdminView() {
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	async function load() {
		const response = await fetch("/api/admin/stay-bookings", { cache: "no-store" });
		const body = (await response.json()) as { bookings?: Booking[]; error?: string };
		if (!response.ok) {
			setError(body.error || "Nie udało się pobrać noclegów.");
		} else {
			setBookings(body.bookings || []);
		}
		setLoading(false);
	}
	useEffect(() => {
		const controller = new AbortController();
		fetch("/api/admin/stay-bookings", { cache: "no-store", signal: controller.signal })
			.then(async (response) => {
				const body = (await response.json()) as { bookings?: Booking[]; error?: string };
				if (!response.ok) {
					throw new Error(body.error || "Nie udało się pobrać noclegów.");
				}
				setBookings(body.bookings || []);
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
	}, []);
	return (
		<main className="site-container py-10 sm:py-16">
			<header>
				<span className="eyebrow">POBYTY NAD WODĄ</span>
				<h1 className="mt-4 font-black font-display text-5xl uppercase sm:text-7xl">Noclegi</h1>
				<p className="mt-4 max-w-2xl text-white/55">Potwierdzaj dostępność i zapisuj ustalenia z gośćmi.</p>
			</header>
			{loading ? (
				<div className="mt-10 grid gap-4">
					<Skeleton className="h-48 w-full" />
					<Skeleton className="h-48 w-full" />
				</div>
			) : null}
			{error ? (
				<Alert variant="destructive" className="mt-8">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			<div className="mt-10 grid gap-4">
				{bookings.map((booking) => (
					<StayCard key={booking.id} booking={booking} onChanged={load} />
				))}
			</div>
			{!loading && bookings.length === 0 ? (
				<Empty className="mt-10 border border-white/15">
					<EmptyHeader>
						<EmptyTitle>Brak rezerwacji</EmptyTitle>
						<EmptyDescription>Nie ma jeszcze rezerwacji noclegów.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
		</main>
	);
}

function StayCard({ booking, onChanged }: { booking: Booking; onChanged: () => Promise<void> }) {
	const [status, setStatus] = useState(booking.status);
	const [notes, setNotes] = useState(booking.staffNotes || "");
	const [working, setWorking] = useState(false);
	const [message, setMessage] = useState("");
	async function save() {
		setWorking(true);
		const response = await fetch("/api/admin/stay-bookings", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: booking.id, status, staffNotes: notes }),
		});
		setWorking(false);
		setMessage(response.ok ? "Zapisano." : "Nie udało się zapisać.");
		if (response.ok) {
			await onChanged();
		}
	}
	return (
		<article className="grid gap-6 border border-white/15 p-5 sm:p-6 lg:grid-cols-[1fr_22rem]">
			<div>
				<div className="flex flex-wrap justify-between gap-3">
					<div>
						<span className="font-mono text-orange-400 text-xs">{booking.reference}</span>
						<h2 className="mt-2 font-black text-xl">{booking.customerName}</h2>
					</div>
					<Badge variant="outline">{stayBookingStatusLabels[booking.status]}</Badge>
				</div>
				<p className="mt-4 font-bold text-lg">
					{booking.checkIn.slice(0, 10)} – {booking.checkOut.slice(0, 10)}
				</p>
				<p className="mt-2 text-white/55">
					{booking.accommodationTypes.join(" lub ")} · {booking.guests} {booking.guests === 1 ? "gość" : "gości"}
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<a href={`tel:${booking.phone}`} className={buttonVariants({ variant: "outline" })}>
						<Phone className="size-4" /> {booking.phone}
					</a>
					<a href={`mailto:${booking.email}`} className={buttonVariants({ variant: "outline" })}>
						<Mail className="size-4" /> {booking.email}
					</a>
				</div>
				{booking.customerNotes ? <p className="mt-4 border-orange-500 border-l-2 pl-3 text-white/65">{booking.customerNotes}</p> : null}
			</div>
			<FieldGroup className="content-start gap-3">
				<Field>
					<FieldLabel htmlFor={`stay-status-${booking.id}`}>Status</FieldLabel>
					<NativeSelect id={`stay-status-${booking.id}`} value={status} onChange={(event) => setStatus(event.target.value as StayBookingStatus)}>
						{Object.entries(stayBookingStatusLabels).map(([value, label]) => (
							<NativeSelectOption key={value} value={value}>
								{label}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</Field>
				<Field>
					<FieldLabel htmlFor={`stay-notes-${booking.id}`}>Notatka dla obsługi</FieldLabel>
					<Textarea id={`stay-notes-${booking.id}`} rows={5} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
				</Field>
				<Button onClick={() => void save()} disabled={working}>
					<Check data-icon="inline-start" /> {working ? "Zapisuję…" : "Zapisz"}
				</Button>
				{message ? <p className="text-orange-100 text-sm">{message}</p> : null}
			</FieldGroup>
		</article>
	);
}
