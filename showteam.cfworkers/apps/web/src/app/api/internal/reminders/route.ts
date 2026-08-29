// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Worker and test environment variables are runtime bindings.
import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { notifyStaff } from "@/lib/push-notifications";
import { newReminderToken, polishDateParts, reminderTokenHash, sendReminderSms } from "@/lib/reminders";
import { addDaysToBookingDate } from "@/lib/reservations";

export async function POST(request: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
		return Response.json({ error: "Brak dostępu." }, { status: 401 });
	}
	const payload = await getPayload({ config });
	const now = new Date();
	const poland = polishDateParts(now);
	const tomorrow = addDaysToBookingDate(poland.date, 1);
	let sent = 0;
	let escalated = 0;

	if (poland.hour === 9) {
		const bookings = await payload.find({
			collection: "bookings",
			overrideAccess: true,
			depth: 1,
			limit: 500,
			where: { and: [{ bookingDate: { equals: tomorrow } }, { status: { equals: "confirmed" } }, { reminderSentAt: { exists: false } }] },
		});
		for (const booking of bookings.docs) {
			const token = newReminderToken();
			const activity = typeof booking.equipment === "object" ? booking.equipment.name : "rezerwacja";
			const result = await sendReminderSms({ phone: booking.phone, activity, time: booking.startTime, token });
			if (!result.sent) {
				payload.logger.error({ msg: "SMS reminder failed", booking: booking.reference, error: result.error });
				continue;
			}
			await payload.update({
				collection: "bookings",
				id: booking.id,
				overrideAccess: true,
				data: { reminderSentAt: now.toISOString(), reminderTokenHash: await reminderTokenHash(token) },
			});
			sent += 1;
		}
	}

	if (poland.hour === 15) {
		const threshold = new Date(now.valueOf() - 6 * 60 * 60 * 1000).toISOString();
		const bookings = await payload.find({
			collection: "bookings",
			overrideAccess: true,
			depth: 1,
			limit: 500,
			where: {
				and: [
					{ bookingDate: { equals: tomorrow } },
					{ status: { equals: "confirmed" } },
					{ reminderSentAt: { less_than_equal: threshold } },
					{ reminderResponse: { exists: false } },
					{ reminderEscalatedAt: { exists: false } },
				],
			},
		});
		for (const booking of bookings.docs) {
			const activity = typeof booking.equipment === "object" ? booking.equipment.name : "Aktywność";
			await notifyStaff(database, {
				title: "Zadzwoń do klienta",
				body: `${booking.customerName} nie odpowiedział/a na SMS · ${activity} ${booking.startTime}`,
				url: `/admin/collections/bookings/${booking.id}`,
			});
			await payload.update({ collection: "bookings", id: booking.id, overrideAccess: true, data: { reminderEscalatedAt: now.toISOString() } });
			escalated += 1;
		}
	}
	return Response.json({ hour: poland.hour, date: poland.date, sent, escalated, smsConfigured: Boolean(process.env.SMSAPI_ACCESS_TOKEN) });
}
