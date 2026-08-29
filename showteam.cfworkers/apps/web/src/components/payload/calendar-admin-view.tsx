"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { StaffEventEditor } from "@/components/payload/staff-event-editor";

const OperationsCalendar = dynamic(() => import("@/components/operations-calendar").then((module) => module.OperationsCalendar), { ssr: false });

export function CalendarAdminView() {
	const [calendarVersion, setCalendarVersion] = useState(0);
	const [editor, setEditor] = useState<{ date: string; id?: string } | null>(null);
	const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
	const changed = () => setCalendarVersion((version) => version + 1);
	return (
		<div className="calendar-admin-view">
			<div className="calendar-admin-heading">
				<div>
					<span>REZERWACJE I PLAN BAZY</span>
					<h1>Kalendarz bazy</h1>
					<p>Kliknij dzień w kalendarzu, aby dodać wydarzenie. Czerwone wydarzenia blokują rezerwacje.</p>
				</div>
				<button type="button" onClick={() => setEditor({ date: today })}>
					<Plus aria-hidden="true" /> Dodaj wydarzenie
				</button>
			</div>
			<div key={calendarVersion} className="calendar-admin-calendar">
				<OperationsCalendar onDateSelect={(date) => setEditor({ date })} onEditStaffEvent={(id) => setEditor({ date: today, id })} />
			</div>
			{editor ? (
				<StaffEventEditor
					key={`${editor.id || "new"}-${editor.date}`}
					open={true}
					selectedDate={editor.date}
					eventId={editor.id}
					onClose={() => setEditor(null)}
					onSaved={changed}
				/>
			) : null}
		</div>
	);
}
