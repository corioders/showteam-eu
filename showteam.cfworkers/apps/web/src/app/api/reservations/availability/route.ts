import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { ensureOperationalTables } from "@/lib/operational-tables";
import { BASE_CLOSE_TIME, BASE_OPEN_TIME, createTimeSlots, endTime, isActivityOpenDate, isBookingDate, todayInPoland } from "@/lib/reservations";
import { type StaffEventDatabaseRow, staffEventBlocksRange, staffEventFromDatabaseRow } from "@/lib/staff-events";
import { getWindForecast, recommendationWindows, recommendSlot } from "@/lib/wind-recommendations";

export async function GET(request: Request) {
	await ensureOperationalTables(database);
	const url = new URL(request.url);
	const equipmentId = Number(url.searchParams.get("equipment"));
	const date = url.searchParams.get("date") || "";
	if (!Number.isInteger(equipmentId) || !isBookingDate(date) || date < todayInPoland()) {
		return Response.json({ error: "Nieprawidłowa aktywność lub data." }, { status: 400 });
	}

	const payload = await getPayload({ config });
	let equipment;
	try {
		equipment = await payload.findByID({ collection: "equipment", id: equipmentId, overrideAccess: false });
	} catch {
		return Response.json({ error: "Nie znaleziono aktywności." }, { status: 404 });
	}
	if (!equipment.active) {
		return Response.json({ error: "Ta aktywność nie jest obecnie dostępna." }, { status: 404 });
	}
	if (!isActivityOpenDate(date, Boolean(equipment.unavailableWeekends))) {
		return Response.json(
			{
				slots: [],
				durationMinutes: equipment.durationMinutes,
				openTime: BASE_OPEN_TIME,
				closeTime: BASE_CLOSE_TIME,
				windStatus: "outside-range",
				recommendationNote:
					equipment.unavailableWeekends && [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())
						? "Ta aktywność jest niedostępna w weekendy."
						: "WAKE & SURF Village działa od maja do końca października.",
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	}
	const resourceKey = equipment.sharedResourceKey || `activity:${equipmentId}`;

	const [reserved, staffEvents, wind] = await Promise.all([
		database
			.prepare("SELECT start_time, COUNT(*) AS reserved FROM booking_slots WHERE resource_key = ? AND booking_date = ? GROUP BY start_time")
			.bind(resourceKey, date)
			.all<{ start_time: string; reserved: number }>(),
		database
			.prepare(`SELECT id, title, start_date, end_date, start_time, end_time, all_day, blocks_base, notes, recurrence, recurrence_until
      FROM staff_events WHERE blocks_base = true AND start_date <= ? AND COALESCE(recurrence_until, end_date, start_date) >= ?`)
			.bind(date, date)
			.all<StaffEventDatabaseRow>(),
		getWindForecast(date),
	]);
	const blockingEvents = staffEvents.results.map(staffEventFromDatabaseRow);

	const counts = new Map(reserved.results.map((row) => [row.start_time, Number(row.reserved)]));
	const forecastByHour = new Map(wind.hours.map((hour) => [hour.time.slice(11, 13), hour]));
	const windows = recommendationWindows(equipment);
	const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
	const slots = createTimeSlots(BASE_OPEN_TIME, BASE_CLOSE_TIME, equipment.durationMinutes)
		.filter((time) => date !== todayInPoland() || time > currentTime)
		.filter((time) => !blockingEvents.some((event) => staffEventBlocksRange(event, date, time, endTime(time, equipment.durationMinutes))))
		.map((time) => ({
			time,
			available: Math.max(0, equipment.quantity - (counts.get(time) || 0)),
			recommendation: recommendSlot({
				time,
				durationMinutes: equipment.durationMinutes,
				profile: equipment.weatherProfile,
				windows,
				thresholds: {
					mediumMinKmh: equipment.windMediumMinKmh,
					mediumMaxKmh: equipment.windMediumMaxKmh,
					bestMinKmh: equipment.windBestMinKmh,
					bestMaxKmh: equipment.windBestMaxKmh,
					professionalMinKmh: equipment.professionalWindMinKmh,
				},
				forecast: forecastByHour.get(time.slice(0, 2)),
			}),
		}))
		.filter((slot) => slot.available > 0);
	return Response.json(
		{
			slots,
			durationMinutes: equipment.durationMinutes,
			openTime: BASE_OPEN_TIME,
			closeTime: BASE_CLOSE_TIME,
			windStatus: wind.status,
			recommendationNote: equipment.recommendationNote || null,
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
}
