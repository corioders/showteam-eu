import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { isBookingDate, timeToMinutes, todayInPoland } from "@/lib/reservations";
import { type StaffEventDatabaseRow, type StaffEventRecord, staffEventBlocksRange, staffEventFromDatabaseRow } from "@/lib/staff-events";

type EventRow = StaffEventDatabaseRow & { created_at: number; updated_at: number };

async function admin(request: Request) {
	const payload = await getPayload({ config });
	return (await payload.auth({ headers: request.headers })).user ? payload : null;
}

export async function GET(request: Request) {
	if (!(await admin(request))) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	await ensureOperationalTables(database);
	const id = new URL(request.url).searchParams.get("id");
	if (id) {
		if (!/^[0-9a-f-]{36}$/.test(id)) {
			return Response.json({ error: "Nie znaleziono wydarzenia." }, { status: 400 });
		}
		const row = await database
			.prepare(`SELECT id, title, start_date, end_date, start_time, end_time, all_day, blocks_base,
      notes, recurrence, recurrence_until, created_at, updated_at FROM staff_events WHERE id = ?`)
			.bind(id)
			.first<EventRow>();
		if (!row) {
			return Response.json({ error: "Nie znaleziono wydarzenia." }, { status: 404 });
		}
		return Response.json({ event: staffEventFromDatabaseRow(row) }, { headers: { "Cache-Control": "no-store" } });
	}
	const rows = await database
		.prepare(`SELECT id, title, start_date, end_date, start_time, end_time, all_day, blocks_base,
    notes, recurrence, recurrence_until, created_at, updated_at FROM staff_events
    WHERE COALESCE(recurrence_until, end_date, start_date) >= ? ORDER BY start_date, start_time LIMIT 1000`)
		.bind(todayInPoland())
		.all<EventRow>();
	return Response.json({ events: rows.results.map(staffEventFromDatabaseRow) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
	return save(request);
}

export async function PATCH(request: Request) {
	return save(request, true);
}

async function save(request: Request, update = false) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	if (!(await admin(request))) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const parsed = parseEvent(input);
	if (!parsed.event) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}
	const id = update ? String(input?.id || "") : crypto.randomUUID();
	if (!/^[0-9a-f-]{36}$/.test(id)) {
		return Response.json({ error: "Nie znaleziono wydarzenia." }, { status: 400 });
	}
	await ensureOperationalTables(database);
	if (update && !(await database.prepare("SELECT id FROM staff_events WHERE id = ?").bind(id).first())) {
		return Response.json({ error: "Nie znaleziono wydarzenia." }, { status: 404 });
	}
	const now = Date.now();
	const event = { ...parsed.event, id };
	if (update) {
		await database
			.prepare(`UPDATE staff_events SET title = ?, start_date = ?, end_date = ?, start_time = ?, end_time = ?,
      all_day = ?, blocks_base = ?, notes = ?, recurrence = ?, recurrence_until = ?, updated_at = ? WHERE id = ?`)
			.bind(
				event.title,
				event.startDate,
				event.endDate,
				event.startTime,
				event.endTime,
				event.allDay,
				event.blocksBase,
				event.notes,
				event.recurrence,
				event.recurrenceUntil,
				now,
				id,
			)
			.run();
	} else {
		await database
			.prepare(`INSERT INTO staff_events (id, title, start_date, end_date, start_time, end_time, all_day,
      blocks_base, notes, recurrence, recurrence_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
			.bind(
				id,
				event.title,
				event.startDate,
				event.endDate,
				event.startTime,
				event.endTime,
				event.allDay,
				event.blocksBase,
				event.notes,
				event.recurrence,
				event.recurrenceUntil,
				now,
				now,
			)
			.run();
	}
	const conflicts = event.blocksBase ? await conflictingBookings(event) : 0;
	return Response.json({ event, conflictingBookings: conflicts }, { status: update ? 200 : 201 });
}

export async function DELETE(request: Request) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	if (!(await admin(request))) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as { id?: unknown } | null;
	const id = String(input?.id || "");
	if (!/^[0-9a-f-]{36}$/.test(id)) {
		return Response.json({ error: "Nie znaleziono wydarzenia." }, { status: 400 });
	}
	await ensureOperationalTables(database);
	await database.prepare("DELETE FROM staff_events WHERE id = ?").bind(id).run();
	return new Response(null, { status: 204 });
}

function parseEvent(input: Record<string, unknown> | null): { event?: Omit<StaffEventRecord, "id">; error?: string } {
	if (!input) {
		return { error: "Nie udało się odczytać formularza." };
	}
	const title = String(input.title || "")
		.trim()
		.slice(0, 120);
	const startDate = String(input.startDate || "");
	const endDate = String(input.endDate || "") || null;
	const allDay = input.allDay !== false;
	const blocksBase = input.blocksBase !== false;
	const startTime = allDay ? null : String(input.startTime || "") || null;
	const endTime = allDay ? null : String(input.endTime || "") || null;
	const notes =
		String(input.notes || "")
			.trim()
			.slice(0, 1000) || null;
	const recurrence = input.recurrence === "weekly" ? "weekly" : "none";
	const recurrenceUntil = recurrence === "weekly" ? String(input.recurrenceUntil || "") || null : null;
	if (title.length < 2) {
		return { error: "Wpisz nazwę wydarzenia." };
	}
	if (!isBookingDate(startDate) || (endDate && (!isBookingDate(endDate) || endDate < startDate))) {
		return { error: "Sprawdź datę rozpoczęcia i zakończenia." };
	}
	if (!allDay && (!startTime || !Number.isFinite(timeToMinutes(startTime)))) {
		return { error: "Wpisz godzinę rozpoczęcia." };
	}
	if (!allDay && blocksBase && (!endTime || !Number.isFinite(timeToMinutes(endTime)))) {
		return { error: "Wydarzenie blokujące bazę musi mieć godzinę zakończenia albo trwać cały dzień." };
	}
	if (!allDay && endTime && startDate === (endDate || startDate) && timeToMinutes(endTime) <= timeToMinutes(startTime!)) {
		return { error: "Godzina zakończenia musi być późniejsza niż rozpoczęcia." };
	}
	if (recurrence === "weekly" && (!recurrenceUntil || !isBookingDate(recurrenceUntil) || recurrenceUntil < (endDate || startDate))) {
		return { error: "Wpisz poprawną datę końca powtarzania." };
	}
	return { event: { title, startDate, endDate, startTime, endTime, allDay, blocksBase, notes, recurrence, recurrenceUntil } };
}

async function conflictingBookings(event: StaffEventRecord): Promise<number> {
	const end = event.recurrenceUntil || event.endDate || event.startDate;
	const bookings = await database
		.prepare(`SELECT booking_date, start_time, end_time FROM bookings
    WHERE status != 'cancelled' AND booking_date >= ? AND booking_date <= ?`)
		.bind(event.startDate, end)
		.all<{ booking_date: string; start_time: string; end_time: string }>();
	return bookings.results.filter((booking) => staffEventBlocksRange(event, booking.booking_date, booking.start_time, booking.end_time)).length;
}
