import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { eventInquiryReference } from "@/lib/event-inquiries";
import { notifyStaff } from "@/lib/push-notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { isBookingDate, normalizePhone, todayInPoland } from "@/lib/reservations";

type DateOption = { startDate?: unknown; endDate?: unknown };
type InquiryInput = {
	eventTypes?: unknown;
	dateOptions?: unknown;
	startTime?: unknown;
	endTime?: unknown;
	adults?: unknown;
	children?: unknown;
	childrenAgeRange?: unknown;
	activities?: unknown;
	specialActivities?: unknown;
	cateringOptions?: unknown;
	cateringNotes?: unknown;
	attractionOptions?: unknown;
	attractionNotes?: unknown;
	wishes?: unknown;
	contactName?: unknown;
	company?: unknown;
	phone?: unknown;
	email?: unknown;
	privacyConsent?: unknown;
	website?: unknown;
};

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Nieprawidłowe źródło żądania." }, { status: 403 });
	}
	const rateLimit = await checkRateLimit(database, request, "event-inquiry", 5, 60 * 60);
	if (!rateLimit.allowed) {
		return Response.json({ error: "Wysłano już kilka zapytań. Spróbuj później albo zadzwoń do nas." }, { status: 429 });
	}

	const input = (await request.json().catch(() => null)) as InquiryInput | null;
	if (!input || input.website) {
		return Response.json({ error: "Nie udało się odczytać formularza." }, { status: 400 });
	}
	const eventTypes = stringArray(input.eventTypes).filter((value) => value === "party" || value === "canoe");
	const dates = Array.isArray(input.dateOptions) ? input.dateOptions.slice(0, 50).map(parseDateOption) : [];
	const startTime = time(input.startTime);
	const endTime = time(input.endTime);
	const adults = wholeNumber(input.adults);
	const children = wholeNumber(input.children);
	const childrenAgeRange = shortText(input.childrenAgeRange, 80);
	const activityIds = [...new Set((Array.isArray(input.activities) ? input.activities : []).map(Number).filter(Number.isInteger))];
	const specialActivities = stringArray(input.specialActivities).filter((value) => value === "Spływ kajakowy" || value === "Nocny spływ kajakowy");
	const cateringOptions = stringArray(input.cateringOptions).map((value) => value.slice(0, 80));
	const attractionOptions = stringArray(input.attractionOptions).map((value) => value.slice(0, 80));
	const contactName = shortText(input.contactName, 120);
	const company = shortText(input.company, 120);
	const phone = normalizePhone(String(input.phone || ""));
	const email = String(input.email || "")
		.trim()
		.toLowerCase()
		.slice(0, 200);

	if (eventTypes.length === 0) {
		return Response.json({ field: "eventTypes", error: "Wybierz imprezę, spływ albo oba warianty." }, { status: 400 });
	}
	if (dates.length === 0 || dates.some((date) => !date || date.startDate < todayInPoland())) {
		return Response.json({ field: "dateOptions", error: "Dodaj co najmniej jeden poprawny, przyszły termin." }, { status: 400 });
	}
	if (!startTime || !endTime) {
		return Response.json({ field: "times", error: "Wpisz planowaną godzinę rozpoczęcia i zakończenia." }, { status: 400 });
	}
	if (adults === null || children === null || adults + children < 1) {
		return Response.json({ field: "participants", error: "Wpisz liczbę dorosłych i dzieci." }, { status: 400 });
	}
	if (children > 0 && childrenAgeRange.length === 0) {
		return Response.json({ field: "childrenAgeRange", error: "Wpisz orientacyjny wiek dzieci." }, { status: 400 });
	}
	if (contactName.length < 2 || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
		return Response.json({ field: "contact", error: "Sprawdź imię, telefon i e-mail." }, { status: 400 });
	}
	if (input.privacyConsent !== true) {
		return Response.json({ field: "privacyConsent", error: "Zgoda jest potrzebna, aby obsłużyć zapytanie." }, { status: 400 });
	}

	const payload = await getPayload({ config });
	const [activities, settings] = await Promise.all([
		activityIds.length > 0
			? payload.find({ collection: "equipment", overrideAccess: true, limit: 100, where: { and: [{ id: { in: activityIds } }, { active: { equals: true } }] } })
			: Promise.resolve({ docs: [] }),
		payload.findGlobal({ slug: "event-settings", overrideAccess: true }),
	]);
	if (activities.docs.length !== activityIds.length) {
		return Response.json({ field: "activities", error: "Jedna z aktywności nie jest już dostępna. Odśwież stronę." }, { status: 400 });
	}
	const allowedCatering = new Set((settings.cateringOptions || []).map((option) => option.label));
	const allowedAttractions = new Set((settings.attractionOptions || []).map((option) => option.label));
	if (cateringOptions.some((option) => !allowedCatering.has(option)) || attractionOptions.some((option) => !allowedAttractions.has(option))) {
		return Response.json({ error: "Lista propozycji zmieniła się. Odśwież stronę i wybierz ponownie." }, { status: 400 });
	}

	const id = crypto.randomUUID();
	const reference = eventInquiryReference(id);
	try {
		await payload.create({
			collection: "event-inquiries",
			overrideAccess: true,
			data: {
				reference,
				status: "new",
				eventTypes,
				dateOptions: dates as { startDate: string; endDate?: string }[],
				startTime,
				endTime,
				adults,
				children,
				childrenAgeRange: childrenAgeRange || undefined,
				activities: activityIds,
				specialActivities,
				cateringOptions,
				cateringNotes: longText(input.cateringNotes),
				attractionOptions,
				attractionNotes: longText(input.attractionNotes),
				wishes: longText(input.wishes),
				contactName,
				company: company || undefined,
				phone,
				email,
				privacyConsent: true,
			},
		});
		await notifyStaff(database, { title: "Nowe zapytanie o imprezę", body: `${contactName} · ${eventTypes.includes("canoe") ? "spływ" : "impreza"}`, url: "/a/imprezy" });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Event inquiry creation failed" });
		return Response.json({ error: "Nie udało się zapisać zapytania. Spróbuj ponownie lub zadzwoń do nas." }, { status: 500 });
	}
	return Response.json({ reference }, { status: 201 });
}

function parseDateOption(value: DateOption): { startDate: string; endDate?: string } | null {
	const startDate = String(value?.startDate || "");
	const endDate = String(value?.endDate || "");
	if (!isBookingDate(startDate) || (endDate && (!isBookingDate(endDate) || endDate < startDate))) {
		return null;
	}
	return { startDate, endDate: endDate || undefined };
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value)
		? [
				...new Set(
					value
						.filter((item): item is string => typeof item === "string")
						.map((item) => item.trim())
						.filter(Boolean),
				),
			]
		: [];
}

function time(value: unknown): string | null {
	const result = String(value || "");
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(result) ? result : null;
}

function wholeNumber(value: unknown): number | null {
	const number = Number(value);
	return Number.isInteger(number) && number >= 0 && number <= 1000 ? number : null;
}

function shortText(value: unknown, max: number): string {
	return String(value || "")
		.trim()
		.slice(0, max);
}
function longText(value: unknown): string | undefined {
	return shortText(value, 2000) || undefined;
}
