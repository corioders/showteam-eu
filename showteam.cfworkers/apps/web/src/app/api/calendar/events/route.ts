import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { ensureOperationalTables } from "@/lib/operational-tables";
import { addDaysToBookingDate } from "@/lib/reservations";
import { type StaffEventDatabaseRow, staffEventFromDatabaseRow, staffEventInstances } from "@/lib/staff-events";
import { tvCookie, tvCookieName, verifyTvToken } from "@/lib/tv-auth";

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
	return cookieHeader
		?.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

export async function GET(request: Request) {
	await ensureOperationalTables(database);
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	const tvToken = cookieValue(request.headers.get("cookie"), tvCookieName);
	const tvAuthorized = await verifyTvToken(database, tvToken);
	if (!user && !tvAuthorized) {
		return Response.json({ error: "Brak dostępu." }, { status: 401 });
	}

	const url = new URL(request.url);
	const start = (url.searchParams.get("start") || "0000-01-01").slice(0, 10);
	const end = (url.searchParams.get("end") || "9999-12-31").slice(0, 10);
	const result = await payload.find({
		collection: "bookings",
		overrideAccess: true,
		depth: 1,
		limit: 1000,
		sort: "bookingDate",
		where: { and: [{ bookingDate: { greater_than_equal: start } }, { bookingDate: { less_than: end } }, { status: { not_equals: "cancelled" } }] },
	});
	const staffEvents = await database
		.prepare(`SELECT id, title, start_date, end_date, start_time, end_time, all_day, blocks_base, notes, recurrence, recurrence_until
    FROM staff_events WHERE start_date < ? AND COALESCE(recurrence_until, end_date, start_date) >= ? ORDER BY start_date, start_time`)
		.bind(end, start)
		.all<StaffEventDatabaseRow>();
	const bookingEvents = result.docs.map((booking) => {
		const equipment = typeof booking.equipment === "object" ? booking.equipment : null;
		return {
			id: String(booking.id),
			title: `${equipment?.name || "Aktywność"} · ${booking.customerName}`,
			start: `${booking.bookingDate}T${booking.startTime}:00`,
			end: `${booking.bookingDate}T${booking.endTime}:00`,
			extendedProps: {
				kind: "booking",
				reference: booking.reference,
				phone: booking.phone,
				email: booking.email || "",
				status: booking.status,
				notes: booking.staffNotes || booking.customerNotes || "",
			},
		};
	});
	const internalEvents = staffEvents.results.flatMap((row) => {
		const event = staffEventFromDatabaseRow(row);
		return staffEventInstances(event, start, end).map((instance) => ({
			id: `staff:${event.id}:${instance.occurrenceStartDate}`,
			title: event.title,
			start: event.allDay ? instance.occurrenceStartDate : `${instance.occurrenceStartDate}T${event.startTime}:00`,
			end: event.allDay ? addDaysToBookingDate(instance.occurrenceEndDate, 1) : event.endTime ? `${instance.occurrenceEndDate}T${event.endTime}:00` : undefined,
			allDay: event.allDay,
			backgroundColor: event.blocksBase ? "#b42318" : "#126782",
			borderColor: event.blocksBase ? "#ff6b5f" : "#48cae4",
			textColor: "#ffffff",
			extendedProps: {
				kind: "staff-event",
				reference: event.blocksBase ? "BLOKUJE BAZĘ" : "WYDARZENIE",
				phone: "",
				email: "",
				status: event.blocksBase ? "blocked" : "planned",
				notes: event.notes || "",
				staffEventId: event.id,
			},
		}));
	});
	const response = Response.json([...bookingEvents, ...internalEvents], { headers: { "Cache-Control": "no-store" } });
	if (tvAuthorized && tvToken) {
		response.headers.append("Set-Cookie", tvCookie(tvToken));
	}
	return response;
}
