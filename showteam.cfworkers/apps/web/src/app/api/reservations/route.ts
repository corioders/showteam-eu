// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/suspicious/noEvolvingTypes: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/suspicious/noImplicitAnyLet: Legacy SHOWteam behavior is preserved during the structural template migration.
import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { ensureOperationalTables } from "@/lib/operational-tables";
import { notifyStaff } from "@/lib/push-notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	BASE_CLOSE_TIME,
	BASE_OPEN_TIME,
	bookingReference,
	createTimeSlots,
	endTime,
	isActivityOpenDate,
	isBookingDate,
	isUniqueConstraintError,
	normalizePhone,
	todayInPoland,
} from "@/lib/reservations";
import { type StaffEventDatabaseRow, staffEventBlocksRange, staffEventFromDatabaseRow } from "@/lib/staff-events";

type ReservationInput = {
	equipmentId?: unknown;
	date?: unknown;
	time?: unknown;
	name?: unknown;
	phone?: unknown;
	email?: unknown;
	notes?: unknown;
	instructorRequired?: unknown;
	website?: unknown;
};

export async function POST(request: Request) {
	await ensureOperationalTables(database);
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Nieprawidłowe źródło żądania." }, { status: 403 });
	}
	const rateLimit = await checkRateLimit(database, request, "reservation", 10, 60 * 60);
	if (!rateLimit.allowed) {
		return Response.json(
			{ error: "Za dużo prób. Spróbuj ponownie później lub zadzwoń do nas." },
			{ status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
		);
	}

	let input: ReservationInput;
	try {
		input = (await request.json()) as ReservationInput;
	} catch {
		return Response.json({ error: "Nieprawidłowe dane." }, { status: 400 });
	}
	if (input.website) {
		return Response.json({ error: "Nie udało się zapisać rezerwacji." }, { status: 400 });
	}

	const equipmentId = Number(input.equipmentId);
	const date = String(input.date || "");
	const time = String(input.time || "");
	const name = String(input.name || "")
		.trim()
		.slice(0, 120);
	const phone = normalizePhone(String(input.phone || ""));
	const email = String(input.email || "")
		.trim()
		.toLowerCase()
		.slice(0, 200);
	const notes = String(input.notes || "")
		.trim()
		.slice(0, 500);
	const instructorRequired = input.instructorRequired === true;
	if (!Number.isInteger(equipmentId) || !isBookingDate(date) || date < todayInPoland() || name.length < 2 || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
		return Response.json({ error: "Sprawdź datę, imię, telefon i e-mail." }, { status: 400 });
	}

	const payload = await getPayload({ config });
	let equipment;
	try {
		equipment = await payload.findByID({ collection: "equipment", id: equipmentId, overrideAccess: false });
	} catch {
		return Response.json({ error: "Nie znaleziono aktywności." }, { status: 404 });
	}
	if (!isActivityOpenDate(date, Boolean(equipment.unavailableWeekends))) {
		return Response.json(
			{
				error:
					equipment.unavailableWeekends && [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())
						? "Ta aktywność jest niedostępna w weekendy."
						: "WAKE & SURF Village działa od maja do końca października.",
			},
			{ status: 409 },
		);
	}
	if (!equipment.active || !createTimeSlots(BASE_OPEN_TIME, BASE_CLOSE_TIME, equipment.durationMinutes).includes(time)) {
		return Response.json({ error: "Wybrany termin jest niedostępny." }, { status: 409 });
	}

	const duplicate = await payload.count({
		collection: "bookings",
		where: { and: [{ phone: { equals: phone } }, { bookingDate: { equals: date } }, { status: { not_equals: "cancelled" } }] },
		overrideAccess: true,
	});
	if (duplicate.totalDocs >= 5) {
		return Response.json({ error: "Dla tego numeru jest już kilka rezerwacji tego dnia. Zadzwoń do nas." }, { status: 429 });
	}

	const reservationId = crypto.randomUUID();
	const reservationEnd = endTime(time, equipment.durationMinutes);
	const resourceKey = equipment.sharedResourceKey || `activity:${equipmentId}`;
	const staffEvents = await database
		.prepare(`SELECT id, title, start_date, end_date, start_time, end_time, all_day, blocks_base, notes, recurrence, recurrence_until
    FROM staff_events WHERE blocks_base = true AND start_date <= ? AND COALESCE(recurrence_until, end_date, start_date) >= ?`)
		.bind(date, date)
		.all<StaffEventDatabaseRow>();
	if (staffEvents.results.map(staffEventFromDatabaseRow).some((event) => staffEventBlocksRange(event, date, time, reservationEnd))) {
		return Response.json({ error: "Termin niedostępny." }, { status: 409 });
	}
	let allocatedUnit: number | null = null;
	for (let unit = 1; unit <= equipment.quantity; unit += 1) {
		try {
			const allocation = await database
				.prepare(`INSERT INTO booking_slots (equipment_id, booking_date, start_time, unit_number, reservation_id, resource_key)
        VALUES (?, ?, ?, ?, ?, ?)`)
				.bind(equipmentId, date, time, unit, reservationId, resourceKey)
				.run();
			if (!allocation.meta.changes) {
				break;
			}
			allocatedUnit = unit;
			break;
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				continue;
			}
			payload.logger.error({ err: error, msg: "Reservation slot allocation failed" });
			return Response.json({ error: "Nie udało się sprawdzić terminu. Spróbuj ponownie." }, { status: 500 });
		}
	}
	if (!allocatedUnit) {
		return Response.json({ error: "Ten termin właśnie został zajęty. Wybierz inny." }, { status: 409 });
	}

	const reference = bookingReference(reservationId);
	try {
		await payload.create({
			collection: "bookings",
			overrideAccess: true,
			data: {
				reference,
				reservationId,
				equipment: equipmentId,
				bookingDate: date,
				startTime: time,
				endTime: reservationEnd,
				customerName: name,
				phone,
				email,
				customerNotes: notes || undefined,
				instructorRequired,
				status: "pending",
				source: "website",
			},
		});
	} catch (error) {
		await database.prepare("DELETE FROM booking_slots WHERE reservation_id = ?").bind(reservationId).run();
		payload.logger.error({ err: error, msg: "Reservation creation failed" });
		return Response.json({ error: "Nie udało się zapisać rezerwacji. Spróbuj ponownie." }, { status: 500 });
	}
	await notifyStaff(database, { title: "Nowa rezerwacja", body: `${equipment.name} · ${date} ${time} · ${name}`, url: "/admin/collections/bookings" });
	return Response.json({ reference, equipment: equipment.name, date, time, endTime: reservationEnd, status: "pending" }, { status: 201 });
}
