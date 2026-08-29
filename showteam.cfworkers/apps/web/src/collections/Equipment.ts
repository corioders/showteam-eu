// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/suspicious/noEvolvingTypes: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
import { APIError, type CollectionConfig, ValidationError } from "payload";

import { MINIMUM_RESERVATION_MINUTES, timeToMinutes, todayInPoland } from "@/lib/reservations";
import { slugFromName } from "@/lib/slug";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Equipment: CollectionConfig = {
	slug: "equipment",
	labels: { singular: "Aktywność", plural: "Aktywności" },
	admin: {
		components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
		hideAPIURL: true,
		useAsTitle: "name",
		group: "Rezerwacje",
		defaultColumns: ["name", "quantity", "active"],
		description: "Aktywności dostępne dla klientów. Zmiany automatycznie pojawiają się na stronie rezerwacji i w kalendarzu.",
		preview: () => "/rezerwacje",
	},
	hooks: {
		beforeValidate: [
			async ({ data, originalDoc, req }) => {
				if (!data) {
					return data;
				}
				if (originalDoc?.slug) {
					data.slug = originalDoc.slug;
				} else {
					const base = slugFromName(String(data.name || "")) || "aktywnosc";
					let candidate = base;
					let suffix = 2;
					while ((await req.payload.count({ collection: "equipment", where: { slug: { equals: candidate } }, overrideAccess: true })).totalDocs) {
						candidate = `${base}-${suffix++}`;
					}
					data.slug = candidate;
				}
				const duration = Number(data.durationMinutes);
				const errors = [];
				if (!Number.isFinite(duration) || duration < MINIMUM_RESERVATION_MINUTES) {
					errors.push({ path: "durationMinutes", label: "Długość jednej rezerwacji", message: "Rezerwacja musi trwać co najmniej 60 minut." });
				}
				if ((data.sharedResourceKey ?? originalDoc?.sharedResourceKey) && duration !== 60) {
					errors.push({
						path: "durationMinutes",
						label: "Długość jednej rezerwacji",
						message: "Ten sam kort obsługuje tenis i padel, dlatego rezerwacja musi trwać 60 minut.",
					});
				}
				for (const number of [1, 2] as const) {
					const startField = `recommendedStart${number}` as const;
					const endField = `recommendedEnd${number}` as const;
					const start = String(data[startField] ?? originalDoc?.[startField] ?? "");
					const end = String(data[endField] ?? originalDoc?.[endField] ?? "");
					if (Boolean(start) !== Boolean(end)) {
						errors.push({ path: start ? endField : startField, label: `Polecane okno ${number}`, message: "Wpisz obie godziny albo zostaw obie puste." });
					}
					if (start && end && timeToMinutes(start) >= timeToMinutes(end)) {
						errors.push({ path: endField, label: `Polecane okno ${number}`, message: "Koniec polecanego okna musi być później niż początek." });
					}
				}
				const mediumMin = Number(data.windMediumMinKmh ?? originalDoc?.windMediumMinKmh);
				const mediumMax = Number(data.windMediumMaxKmh ?? originalDoc?.windMediumMaxKmh);
				const bestMin = Number(data.windBestMinKmh ?? originalDoc?.windBestMinKmh);
				const bestMax = Number(data.windBestMaxKmh ?? originalDoc?.windBestMaxKmh);
				if (![mediumMin, mediumMax, bestMin, bestMax].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
					errors.push({ path: "windMediumMinKmh", label: "Progi wiatru", message: "Każda prędkość musi być liczbą od 0 do 100 km/h." });
				} else if (!(mediumMin <= bestMin && bestMin <= bestMax && bestMax <= mediumMax)) {
					errors.push({ path: "windBestMinKmh", label: "Progi wiatru", message: "Zakres „najlepszy” musi mieścić się wewnątrz zakresu „średni”." });
				}
				const weatherProfile = String(data.weatherProfile ?? originalDoc?.weatherProfile ?? "any");
				const professionalRaw = data.professionalWindMinKmh ?? originalDoc?.professionalWindMinKmh;
				if (weatherProfile === "wind" && professionalRaw != null) {
					const professionalMin = Number(professionalRaw);
					if (!Number.isFinite(professionalMin) || professionalMin < 0 || professionalMin > 100) {
						errors.push({ path: "professionalWindMinKmh", label: "Warun profesjonalny", message: "Wpisz prędkość od 0 do 100 km/h albo zostaw pole puste." });
					} else if (professionalMin <= bestMax) {
						errors.push({
							path: "professionalWindMinKmh",
							label: "Warun profesjonalny",
							message: "Próg profesjonalny musi być wyższy niż górna granica najlepszego warunu.",
						});
					}
				}
				if (errors.length > 0) {
					throw new ValidationError({ collection: "equipment", errors, req }, req.t);
				}
				return data;
			},
		],
		beforeChange: [
			async ({ data, originalDoc, operation, req }) => {
				if (operation !== "update" || !originalDoc) {
					return data;
				}
				const scheduleFields = ["quantity", "durationMinutes"] as const;
				const scheduleChanged = scheduleFields.some((field) => String(data[field] ?? originalDoc[field]) !== String(originalDoc[field]));
				if (!scheduleChanged) {
					return data;
				}
				const futureBookings = await req.payload.count({
					collection: "bookings",
					where: {
						and: [{ equipment: { equals: originalDoc.id } }, { bookingDate: { greater_than_equal: todayInPoland() } }, { status: { in: ["pending", "confirmed"] } }],
					},
					overrideAccess: true,
				});
				if (futureBookings.totalDocs > 0) {
					throw new APIError("Nie można zmienić liczby miejsc ani czasu, dopóki istnieją przyszłe rezerwacje tej aktywności. Najpierw je anuluj.", 409, null, true);
				}
				return data;
			},
		],
	},
	access: {
		read: ({ req }) => (req.user ? true : { active: { equals: true } }),
		create: isLoggedIn,
		update: isLoggedIn,
		delete: isLoggedIn,
	},
	defaultSort: "sortOrder",
	fields: [
		{
			type: "tabs",
			tabs: [
				{
					label: "1. Aktywność",
					description: "To zobaczy klient podczas rezerwacji.",
					fields: [
						{ name: "name", label: "Nazwa aktywności", type: "text", required: true, admin: { placeholder: "np. SUP jednoosobowy" } },
						{
							name: "description",
							label: "Krótki opis",
							type: "textarea",
							required: true,
							maxLength: 300,
							admin: { description: "Napisz krótko, dla kogo jest aktywność i co warto wiedzieć." },
						},
						{ name: "image", label: "Zdjęcie", type: "upload", relationTo: "media", admin: { hidden: true } },
						{
							type: "row",
							fields: [
								{ name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Woda", options: ["Woda", "Ląd", "Szkolenie", "Inne"] },
								{ name: "quantity", label: "Ile miejsc lub sztuk jest dostępnych?", type: "number", required: true, defaultValue: 1, min: 1, max: 99 },
							],
						},
						{
							name: "notice",
							label: "Ważna informacja dla klienta",
							type: "textarea",
							maxLength: 220,
							admin: { description: "Opcjonalnie, np. „Wymagane uprawnienia”." },
						},
						{
							name: "unavailableWeekends",
							label: "Ta aktywność jest niedostępna w weekendy",
							type: "checkbox",
							defaultValue: false,
							admin: { description: "Zaznacz dla aktywności silnikowych objętych weekendowym zakazem pływania." },
						},
					],
				},
				{
					label: "2. Rezerwacja",
					description: "Aktywności korzystają ze wspólnych godzin bazy 10:00–20:00.",
					fields: [
						{
							name: "durationMinutes",
							label: "Ile minut trwa jedna rezerwacja?",
							type: "number",
							required: true,
							defaultValue: 60,
							min: 60,
							max: 720,
							admin: { description: "Minimum 60 minut." },
						},
						{ name: "openTime", type: "text", required: true, defaultValue: "10:00", admin: { hidden: true } },
						{ name: "closeTime", type: "text", required: true, defaultValue: "20:00", admin: { hidden: true } },
						{ name: "active", label: "Klienci mogą teraz rezerwować tę aktywność", type: "checkbox", defaultValue: true },
					],
				},
				{
					label: "3. Polecane warunki",
					description: "Podpowiedzi pogodowe widoczne podczas rezerwacji.",
					fields: [
						{
							name: "weatherProfile",
							label: "Jakie warunki są najlepsze?",
							type: "select",
							required: true,
							defaultValue: "any",
							options: [
								{ label: "Pogoda bez znaczenia", value: "any" },
								{ label: "Najlepiej bez wiatru", value: "calm" },
								{ label: "Najlepiej z wiatrem", value: "wind" },
							],
						},
						{
							type: "row",
							fields: [
								{ name: "recommendedStart1", label: "Pierwsze okno — od", type: "text", validate: optionalTime },
								{ name: "recommendedEnd1", label: "Pierwsze okno — do", type: "text", validate: optionalTime },
							],
						},
						{
							type: "row",
							fields: [
								{ name: "recommendedStart2", label: "Drugie okno — od", type: "text", validate: optionalTime },
								{ name: "recommendedEnd2", label: "Drugie okno — do", type: "text", validate: optionalTime },
							],
						},
						{
							type: "row",
							fields: [
								{ name: "windMediumMinKmh", label: "Średni warun — od km/h", type: "number", required: true, defaultValue: 0, min: 0, max: 100 },
								{ name: "windMediumMaxKmh", label: "Średni warun — do km/h", type: "number", required: true, defaultValue: 16, min: 0, max: 100 },
							],
						},
						{
							type: "row",
							fields: [
								{ name: "windBestMinKmh", label: "Najlepszy warun — od km/h", type: "number", required: true, defaultValue: 0, min: 0, max: 100 },
								{ name: "windBestMaxKmh", label: "Najlepszy warun — do km/h", type: "number", required: true, defaultValue: 10, min: 0, max: 100 },
							],
						},
						{
							name: "professionalWindMinKmh",
							label: "Warun profesjonalny — od km/h",
							type: "number",
							min: 0,
							max: 100,
							admin: {
								description: "Opcjonalne. Działa tylko dla aktywności, która wymaga wiatru. Zostaw puste, aby wyłączyć.",
								condition: (_, siblingData) => siblingData.weatherProfile === "wind",
							},
						},
						{ name: "recommendationNote", label: "Dodatkowa podpowiedź dla klienta", type: "textarea", maxLength: 220 },
					],
				},
			],
		},
		{ name: "slug", label: "Identyfikator", type: "text", required: true, unique: true, admin: { hidden: true } },
		{ name: "sharedResourceKey", type: "text", admin: { hidden: true } },
		{ name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 100, admin: { hidden: true } },
	],
};

function optionalTime(value: unknown) {
	return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM albo zostaw puste.";
}
