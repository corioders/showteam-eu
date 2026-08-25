import config, { database } from "@payload-config";
import { getPayload } from "payload";

import { type ApplicationCategory, applicationCategories } from "@/lib/application-options";
import {
	applicationDisciplinesForCategory,
	applicationHasSportDetails,
	applicationLevels,
	applicationReference,
	applicationTransport,
	normalizeEmail,
	participantIdentity,
} from "@/lib/applications";
import { notifyStaff } from "@/lib/push-notifications";
import { checkRateLimit } from "@/lib/rate-limit";

type ApplicationInput = Record<string, unknown>;
const string = (input: ApplicationInput, key: string, max: number) =>
	String(input[key] || "")
		.trim()
		.slice(0, max);

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const rateLimit = await checkRateLimit(database, request, "application", 5, 60 * 60);
	if (!rateLimit.allowed) {
		return Response.json({ error: "Wysłano już kilka zgłoszeń. Spróbuj później albo zadzwoń do nas." }, { status: 429 });
	}

	let input: ApplicationInput;
	try {
		input = (await request.json()) as ApplicationInput;
	} catch {
		return Response.json({ error: "Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie." }, { status: 400 });
	}
	if (input.website) {
		return Response.json({ error: "Nie udało się wysłać zgłoszenia." }, { status: 400 });
	}

	const category = string(input, "category", 20);
	const offer = string(input, "offer", 200);
	const firstName = string(input, "firstName", 80);
	const lastName = string(input, "lastName", 100);
	const birthDate = string(input, "birthDate", 10);
	const address = string(input, "address", 300);
	const email = normalizeEmail(string(input, "email", 200));
	const participantEmail = normalizeEmail(string(input, "participantEmail", 200));
	const phone = string(input, "phone", 40);
	const discipline = string(input, "discipline", 40);
	const level = string(input, "level", 40);
	const transport = string(input, "transport", 40);
	const notes = string(input, "notes", 2000);
	const invoiceRequested = input.invoiceRequested === true;
	const invoiceCompany = string(input, "invoiceCompany", 160);
	const invoiceNip = string(input, "invoiceNip", 20).replace(/\D/g, "");
	const invoiceStreet = string(input, "invoiceStreet", 160);
	const invoicePostalCode = string(input, "invoicePostalCode", 10);
	const invoiceCity = string(input, "invoiceCity", 100);

	if (!applicationCategories.some((value) => value === category)) {
		return Response.json({ field: "category", error: "Wybierz rodzaj wyjazdu." }, { status: 400 });
	}
	const applicationCategory = category as ApplicationCategory;
	const required = { offer, firstName, lastName, birthDate, address, email, phone };
	const missing = Object.entries(required).find(([, value]) => value.length < 2)?.[0];
	if (missing) {
		return Response.json({ field: missing, error: "Uzupełnij to pole." }, { status: 400 });
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > new Date().toISOString().slice(0, 10)) {
		return Response.json({ field: "birthDate", error: "Wybierz poprawną datę urodzenia." }, { status: 400 });
	}
	if (!/^\S+@\S+\.\S+$/.test(email)) {
		return Response.json({ field: "email", error: "Wpisz poprawny adres e-mail." }, { status: 400 });
	}
	if (participantEmail && !/^\S+@\S+\.\S+$/.test(participantEmail)) {
		return Response.json({ field: "participantEmail", error: "Wpisz poprawny adres e-mail uczestnika." }, { status: 400 });
	}
	if (phone.replace(/\D/g, "").length < 9) {
		return Response.json({ field: "phone", error: "Wpisz poprawny numer telefonu." }, { status: 400 });
	}
	if (invoiceRequested) {
		if (invoiceCompany.length < 2) {
			return Response.json({ field: "invoiceCompany", error: "Wpisz nazwę firmy." }, { status: 400 });
		}
		if (!/^\d{10}$/.test(invoiceNip)) {
			return Response.json({ field: "invoiceNip", error: "NIP musi mieć 10 cyfr." }, { status: 400 });
		}
		if (invoiceStreet.length < 3) {
			return Response.json({ field: "invoiceStreet", error: "Wpisz ulicę i numer." }, { status: 400 });
		}
		if (!/^\d{2}-\d{3}$/.test(invoicePostalCode)) {
			return Response.json({ field: "invoicePostalCode", error: "Wpisz kod pocztowy w formacie 00-000." }, { status: 400 });
		}
		if (invoiceCity.length < 2) {
			return Response.json({ field: "invoiceCity", error: "Wpisz miejscowość." }, { status: 400 });
		}
	}
	const sportDetails = applicationHasSportDetails(applicationCategory);
	const allowedDisciplines = applicationDisciplinesForCategory(applicationCategory);
	if (discipline && (!sportDetails || !allowedDisciplines.some((value) => value === discipline))) {
		return Response.json({ field: "discipline", error: "Wybierz dyscyplinę pasującą do wyjazdu." }, { status: 400 });
	}
	if (level && (!sportDetails || !applicationLevels.includes(level as (typeof applicationLevels)[number]))) {
		return Response.json({ field: "level", error: "Wybierz poprawny poziom." }, { status: 400 });
	}
	if (transport && (applicationCategory !== "Zima" || !applicationTransport.includes(transport as (typeof applicationTransport)[number]))) {
		return Response.json({ field: "transport", error: "Wybierz poprawną odpowiedź." }, { status: 400 });
	}
	if (input.privacyConsent !== true) {
		return Response.json({ field: "privacyConsent", error: "Zgoda jest potrzebna, aby przyjąć zgłoszenie." }, { status: 400 });
	}
	if (input.accuracyConfirmed !== true) {
		return Response.json({ field: "accuracyConfirmed", error: "Potwierdź poprawność danych." }, { status: 400 });
	}

	const disciplineValue = sportDetails && discipline ? (discipline as (typeof allowedDisciplines)[number]) : undefined;
	const levelValue = sportDetails && level ? (level as (typeof applicationLevels)[number]) : undefined;
	const transportValue = applicationCategory === "Zima" && transport ? (transport as (typeof applicationTransport)[number]) : undefined;
	const participantName = `${firstName} ${lastName}`;
	const newsletterConsent = input.newsletterConsent === true;

	const payload = await getPayload({ config });
	const id = crypto.randomUUID();
	const reference = applicationReference(id);
	try {
		await payload.create({
			collection: "applications",
			overrideAccess: true,
			data: {
				reference,
				status: "new",
				offer,
				participantName,
				participantKey: participantIdentity({ email, participantEmail, participantName, birthDate }),
				birthDate: `${birthDate}T12:00:00.000Z`,
				address,
				email,
				normalizedEmail: email,
				participantEmail: participantEmail || undefined,
				phone,
				discipline: disciplineValue,
				level: levelValue,
				transport: transportValue,
				notes: notes || undefined,
				invoiceRequested,
				invoiceCompany: invoiceRequested ? invoiceCompany : undefined,
				invoiceNip: invoiceRequested ? invoiceNip : undefined,
				invoiceStreet: invoiceRequested ? invoiceStreet : undefined,
				invoicePostalCode: invoiceRequested ? invoicePostalCode : undefined,
				invoiceCity: invoiceRequested ? invoiceCity : undefined,
				privacyConsent: true,
				accuracyConfirmed: true,
				newsletterConsent,
				newsletterConsentedAt: newsletterConsent ? new Date().toISOString() : undefined,
			},
		});
		await notifyStaff(database, { title: "Nowe zgłoszenie", body: `${participantName} · ${offer}`, url: "/a/zgloszenia" });
		// E-mail confirmation is intentionally deferred until the mail provider is configured.
		return Response.json({ reference }, { status: 201 });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Application creation failed" });
		return Response.json({ error: "Nie udało się zapisać zgłoszenia. Spróbuj ponownie lub zadzwoń do nas." }, { status: 500 });
	}
}
