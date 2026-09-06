// biome-ignore-all lint/a11y/noStaticElementInteractions: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/a11y/useButtonType: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/a11y/useKeyWithClickEvents: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/noNonNullAssertion: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Calendar rendering coordinates FullCalendar callbacks and the selected-event dialog.
"use client";

import type { EventSourceFuncArg } from "@fullcalendar/core";
import plLocale from "@fullcalendar/core/locales/pl";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Ban, Clock3, Mail, Pencil, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/components/calendar.module.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CalendarEvent = {
	id: string;
	title: string;
	start: string;
	end?: string;
	allDay?: boolean;
	extendedProps: { kind: "booking" | "staff-event"; reference: string; phone: string; email: string; status: string; notes: string; staffEventId?: string };
};

export function OperationsCalendar({
	tv = false,
	onDateSelect,
	onEditStaffEvent,
}: {
	tv?: boolean;
	onDateSelect?: (date: string) => void;
	onEditStaffEvent?: (id: string) => void;
}) {
	const calendarRef = useRef<FullCalendar>(null);
	const [selected, setSelected] = useState<CalendarEvent | null>(null);
	const [compact, setCompact] = useState<boolean | null>(tv ? true : null);

	useEffect(() => {
		if (tv) {
			return undefined;
		}

		const media = window.matchMedia("(max-width: 700px)");
		const update = () => setCompact(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, [tv]);

	useEffect(() => {
		const timer = window.setInterval(() => calendarRef.current?.getApi().refetchEvents(), 30_000);
		return () => window.clearInterval(timer);
	}, []);

	async function events(info: EventSourceFuncArg, success: (events: CalendarEvent[]) => void, failure: (error: Error) => void) {
		try {
			const response = await fetch(`/api/calendar/events?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`, { cache: "no-store" });
			if (response.status === 401 && tv) {
				return window.location.reload();
			}
			if (!response.ok) {
				throw new Error("Nie udało się odświeżyć kalendarza.");
			}
			success((await response.json()) as CalendarEvent[]);
		} catch (error) {
			failure(error as Error);
		}
	}

	if (compact === null) {
		return <p className={styles.loading}>Ładuję kalendarz…</p>;
	}

	return (
		<div className={`${styles.calendar} ${tv ? styles.calendarTv : ""}`}>
			<FullCalendar
				key={compact ? "compact" : "desktop"}
				ref={calendarRef}
				plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
				locale={plLocale}
				initialView={compact ? "listUpcoming" : "timeGridWeek"}
				events={events}
				firstDay={1}
				allDaySlot={true}
				nowIndicator={true}
				height={tv ? "calc(100vh - 8rem)" : "auto"}
				slotMinTime="07:00:00"
				slotMaxTime="22:00:00"
				views={{ listUpcoming: { type: "list", duration: { days: tv ? 365 : 31 }, buttonText: "Lista" } }}
				eventOrder="start"
				headerToolbar={{ left: "prev,next today", center: "title", right: compact ? "listUpcoming" : "timeGridDay,timeGridWeek,dayGridMonth,listUpcoming" }}
				buttonText={{ today: "Dziś", day: "Dzień", week: "Tydzień", month: "Miesiąc", list: "Lista" }}
				dateClick={onDateSelect ? (info) => onDateSelect(info.dateStr.slice(0, 10)) : undefined}
				eventClick={(info) => setSelected(info.event.toPlainObject() as CalendarEvent)}
				eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
			/>
			<Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
				{selected ? (
					<DialogContent className={styles.dialog}>
						<DialogHeader>
							<DialogDescription className={styles.reference}>
								{selected.extendedProps.status === "blocked" ? (
									<>
										<Ban size={14} /> Blokuje bazę
									</>
								) : (
									selected.extendedProps.reference
								)}
							</DialogDescription>
							<DialogTitle className={styles.eventTitle}>{selected.title}</DialogTitle>
						</DialogHeader>
						<p className={styles.detail}>
							<Clock3 size={16} />
							{selected.start.slice(0, 10)}
							{selected.allDay ? " · cały dzień" : ` · ${selected.start.slice(11, 16)}${selected.end ? `–${selected.end.slice(11, 16)}` : ""}`}
						</p>
						{selected.extendedProps.phone && (
							<a href={`tel:${selected.extendedProps.phone}`} className={styles.phone}>
								<Phone size={16} />
								{selected.extendedProps.phone}
							</a>
						)}
						{selected.extendedProps.email && (
							<a href={`mailto:${selected.extendedProps.email}`} className={styles.phone}>
								<Mail size={16} />
								{selected.extendedProps.email}
							</a>
						)}
						{selected.extendedProps.notes && <p className={styles.notes}>{selected.extendedProps.notes}</p>}
						{onEditStaffEvent && selected.extendedProps.staffEventId ? (
							<Button
								className={styles.edit}
								type="button"
								onClick={() => {
									onEditStaffEvent(selected.extendedProps.staffEventId!);
									setSelected(null);
								}}
							>
								<Pencil data-icon="inline-start" /> Edytuj wydarzenie
							</Button>
						) : null}
					</DialogContent>
				) : null}
			</Dialog>
		</div>
	);
}
