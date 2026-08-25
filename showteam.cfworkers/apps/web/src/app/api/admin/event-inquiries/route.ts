// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/noNonNullAssertion: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { eventInquiryStatuses } from "@/lib/event-inquiries";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { isBookingDate, timeToMinutes } from "@/lib/reservations";

async function admin(request: Request) {
	const payload = await getPayload({ config });
	return (await payload.auth({ headers: request.headers })).user ? payload : null;
}

export async function GET(request: Request) {
	const payload = await admin(request);
	if (!payload) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const [result, settings] = await Promise.all([
		payload.find({ collection: "event-inquiries", overrideAccess: true, depth: 1, limit: 200, sort: "-createdAt" }),
		payload.findGlobal({ slug: "event-settings", overrideAccess: true }),
	]);
	return Response.json({ inquiries: result.docs, total: result.totalDocs, settings }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await admin(request);
	if (!payload) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const cateringOptions = optionList(input?.cateringOptions);
	const attractionOptions = optionList(input?.attractionOptions);
	if (cateringOptions.length === 0 || attractionOptions.length === 0) {
		return Response.json({ error: "Każda lista musi mieć co najmniej jedną propozycję." }, { status: 400 });
	}
	const settings = await payload.updateGlobal({
		slug: "event-settings",
		overrideAccess: true,
		data: {
			cateringOptions: cateringOptions.map((label) => ({ label })),
			attractionOptions: attractionOptions.map((label) => ({ label })),
		},
	});
	return Response.json({ settings });
}

export async function PATCH(request: Request) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await admin(request);
	if (!payload) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const id = Number(input?.id);
	const status = String(input?.status || "");
	const staffNotes = String(input?.staffNotes || "")
		.trim()
		.slice(0, 2000);
	const nextContactAt = String(input?.nextContactAt || "");
	if (!Number.isInteger(id) || !eventInquiryStatuses.includes(status as (typeof eventInquiryStatuses)[number])) {
		return Response.json({ error: "Sprawdź status zapytania." }, { status: 400 });
	}
	if (nextContactAt && Number.isNaN(Date.parse(nextContactAt))) {
		return Response.json({ error: "Sprawdź datę następnego kontaktu." }, { status: 400 });
	}
	const inquiry = await payload.update({
		collection: "event-inquiries",
		id,
		overrideAccess: true,
		data: { status: status as (typeof eventInquiryStatuses)[number], staffNotes, nextContactAt: nextContactAt || null },
	});
	return Response.json({ inquiry });
}

export async function POST(request: Request) {
	if (!validSameOrigin(request)) {
		return Response.json({ error: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await admin(request);
	if (!payload) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const inquiryId = Number(input?.id);
	const title = String(input?.title || "")
		.trim()
		.slice(0, 120);
	const startDate = String(input?.startDate || "");
	const endDate = String(input?.endDate || "") || null;
	const allDay = input?.allDay === true;
	const startTime = allDay ? null : String(input?.startTime || "") || null;
	const endTime = allDay ? null : String(input?.endTime || "") || null;
	const blocksBase = input?.blocksBase !== false;
	if (!Number.isInteger(inquiryId) || title.length < 2) {
		return Response.json({ error: "Wpisz nazwę wydarzenia." }, { status: 400 });
	}
	if (!isBookingDate(startDate) || (endDate && (!isBookingDate(endDate) || endDate < startDate))) {
		return Response.json({ error: "Sprawdź datę wydarzenia." }, { status: 400 });
	}
	if (!allDay && (!startTime || !endTime || !Number.isFinite(timeToMinutes(startTime)) || !Number.isFinite(timeToMinutes(endTime)))) {
		return Response.json({ error: "Wpisz godziny wydarzenia." }, { status: 400 });
	}
	if (!allDay && startDate === (endDate || startDate) && timeToMinutes(endTime!) <= timeToMinutes(startTime!)) {
		return Response.json({ error: "Godzina zakończenia musi być późniejsza." }, { status: 400 });
	}
	const inquiry = await payload.findByID({ collection: "event-inquiries", id: inquiryId, overrideAccess: true, depth: 0 });
	if (inquiry.calendarEventId) {
		return Response.json({ error: "To zapytanie ma już wydarzenie w kalendarzu." }, { status: 409 });
	}
	await ensureOperationalTables(database);
	const eventId = crypto.randomUUID();
	const now = Date.now();
	const notes = `Zapytanie ${inquiry.reference}\n${inquiry.staffNotes || ""}`.trim().slice(0, 1000);
	await database
		.prepare(`INSERT INTO staff_events (id, title, start_date, end_date, start_time, end_time, all_day, blocks_base,
    notes, recurrence, recurrence_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', NULL, ?, ?)`)
		.bind(eventId, title, startDate, endDate, startTime, endTime, allDay, blocksBase, notes || null, now, now)
		.run();
	try {
		await payload.update({ collection: "event-inquiries", id: inquiryId, overrideAccess: true, data: { status: "confirmed", calendarEventId: eventId } });
	} catch (error) {
		await database.prepare("DELETE FROM staff_events WHERE id = ?").bind(eventId).run();
		throw error;
	}
	return Response.json({ eventId }, { status: 201 });
}

function optionList(value: unknown): string[] {
	return Array.isArray(value)
		? [
				...new Set(
					value
						.map((item) =>
							String(item || "")
								.trim()
								.slice(0, 80),
						)
						.filter(Boolean),
				),
			].slice(0, 30)
		: [];
}
