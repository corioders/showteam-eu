import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { notifyStaff } from "@/lib/push-notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { isBookingDate, normalizePhone, todayInPoland } from "@/lib/reservations";
import { stayBookingReference } from "@/lib/stay-bookings";

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const rateLimit = await checkRateLimit(database, request, "stay-booking", 5, 60 * 60);
	if (!rateLimit.allowed) {
		return Response.json({ error: "Wysłano już kilka rezerwacji. Spróbuj później albo zadzwoń do nas." }, { status: 429 });
	}
	const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!input || input.website) {
		return Response.json({ error: "Nie udało się odczytać formularza." }, { status: 400 });
	}
	const allowedTypes = ["Kontener mieszkalny", "Domek holenderski"] as const;
	const accommodationTypes = Array.isArray(input.accommodationTypes)
		? [...new Set(input.accommodationTypes.map(String).filter((type): type is (typeof allowedTypes)[number] => allowedTypes.some((allowed) => allowed === type)))]
		: [];
	const checkIn = String(input.checkIn || "");
	const checkOut = String(input.checkOut || "");
	const guests = Number(input.guests);
	const customerName = String(input.customerName || "")
		.trim()
		.slice(0, 120);
	const phone = normalizePhone(String(input.phone || ""));
	const email = String(input.email || "")
		.trim()
		.toLowerCase()
		.slice(0, 200);
	const notes = String(input.notes || "")
		.trim()
		.slice(0, 2000);
	if (accommodationTypes.length === 0) {
		return Response.json({ field: "accommodationTypes", error: "Wybierz rodzaj noclegu." }, { status: 400 });
	}
	if (!isBookingDate(checkIn) || !isBookingDate(checkOut) || checkIn < todayInPoland() || checkOut <= checkIn) {
		return Response.json({ field: "dates", error: "Wyjazd musi być później niż przyjazd." }, { status: 400 });
	}
	if (!Number.isInteger(guests) || guests < 1 || guests > 100) {
		return Response.json({ field: "guests", error: "Wpisz liczbę gości." }, { status: 400 });
	}
	if (customerName.length < 2 || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
		return Response.json({ field: "contact", error: "Sprawdź imię, telefon i e-mail." }, { status: 400 });
	}
	if (input.privacyConsent !== true) {
		return Response.json({ field: "privacyConsent", error: "Zgoda jest potrzebna, aby obsłużyć rezerwację." }, { status: 400 });
	}
	const payload = await getPayload({ config });
	const id = crypto.randomUUID();
	const reference = stayBookingReference(id);
	try {
		await payload.create({
			collection: "stay-bookings",
			overrideAccess: true,
			data: {
				reference,
				status: "pending",
				accommodationTypes,
				checkIn,
				checkOut,
				guests,
				customerName,
				phone,
				email,
				customerNotes: notes || undefined,
				privacyConsent: true,
			},
		});
		await notifyStaff(database, { title: "Nowa rezerwacja noclegu", body: `${customerName} · ${checkIn}–${checkOut}`, url: "/a/noclegi" });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Stay booking creation failed" });
		return Response.json({ error: "Nie udało się zapisać rezerwacji. Spróbuj ponownie lub zadzwoń do nas." }, { status: 500 });
	}
	return Response.json({ reference }, { status: 201 });
}
