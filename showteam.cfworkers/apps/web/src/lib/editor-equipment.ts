// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/noNonNullAssertion: Legacy SHOWteam behavior is preserved during the structural template migration.
import type { WeatherProfile } from "./reservations";
import { BASE_CLOSE_TIME, BASE_OPEN_TIME, MINIMUM_RESERVATION_MINUTES, timeToMinutes } from "./reservations";

export type EditableEquipment = {
	name: string;
	description: string;
	category: "Woda" | "Ląd" | "Szkolenie" | "Inne";
	quantity: number;
	durationMinutes: number;
	openTime: string;
	closeTime: string;
	unavailableWeekends: boolean;
	notice: string;
	active: boolean;
	weatherProfile: WeatherProfile;
	recommendedStart1: string;
	recommendedEnd1: string;
	recommendedStart2: string;
	recommendedEnd2: string;
	windMediumMinKmh: number;
	windMediumMaxKmh: number;
	windBestMinKmh: number;
	windBestMaxKmh: number;
	professionalWindMinKmh: number | null;
	recommendationNote: string;
	sortOrder: number;
};

const categories = ["Woda", "Ląd", "Szkolenie", "Inne"] as const;
const profiles: WeatherProfile[] = ["any", "calm", "wind"];

export function parseEditableEquipment(input: unknown): { data?: EditableEquipment; errors?: string[] } {
	if (!input || typeof input !== "object") {
		return { errors: ["Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie."] };
	}
	const value = input as Record<string, unknown>;
	const name = text(value.name);
	const description = text(value.description);
	const category = categories.includes(value.category as (typeof categories)[number]) ? (value.category as (typeof categories)[number]) : null;
	const quantity = integer(value.quantity);
	const durationMinutes = integer(value.durationMinutes);
	const weatherProfile = profiles.includes(value.weatherProfile as WeatherProfile) ? (value.weatherProfile as WeatherProfile) : null;
	const recommendedStart1 = text(value.recommendedStart1);
	const recommendedEnd1 = text(value.recommendedEnd1);
	const recommendedStart2 = text(value.recommendedStart2);
	const recommendedEnd2 = text(value.recommendedEnd2);
	const windMediumMinKmh = number(value.windMediumMinKmh);
	const windMediumMaxKmh = number(value.windMediumMaxKmh);
	const windBestMinKmh = number(value.windBestMinKmh);
	const windBestMaxKmh = number(value.windBestMaxKmh);
	const professionalWindMinKmh = value.professionalWindMinKmh === "" || value.professionalWindMinKmh == null ? null : number(value.professionalWindMinKmh);
	const sortOrder = integer(value.sortOrder);
	const errors: string[] = [];

	if (name.length < 2 || name.length > 120) {
		errors.push("Nazwa aktywności musi mieć od 2 do 120 znaków.");
	}
	if (description.length < 10 || description.length > 300) {
		errors.push("Opis aktywności musi mieć od 10 do 300 znaków.");
	}
	if (!category) {
		errors.push("Wybierz kategorię aktywności.");
	}
	if (quantity === null || quantity < 1 || quantity > 99) {
		errors.push("Liczba miejsc lub sztuk musi być od 1 do 99.");
	}
	if (durationMinutes === null || durationMinutes < MINIMUM_RESERVATION_MINUTES || durationMinutes > 720) {
		errors.push("Czas rezerwacji musi wynosić od 60 do 720 minut.");
	}
	if (!weatherProfile) {
		errors.push("Wybierz warunki najlepsze dla aktywności.");
	}
	for (const [start, end, label] of [
		[recommendedStart1, recommendedEnd1, "pierwszego"],
		[recommendedStart2, recommendedEnd2, "drugiego"],
	] as const) {
		if (Boolean(start) !== Boolean(end) || (start && (!validTime(start) || !validTime(end) || timeToMinutes(end) <= timeToMinutes(start)))) {
			errors.push(`Wpisz poprawny początek i koniec ${label} polecanego okna.`);
		}
	}
	const thresholds = [windMediumMinKmh, windMediumMaxKmh, windBestMinKmh, windBestMaxKmh];
	if (thresholds.some((item) => item === null || item < 0 || item > 100)) {
		errors.push("Progi wiatru muszą być liczbami od 0 do 100 km/h.");
	} else if (!(windMediumMinKmh! <= windBestMinKmh! && windBestMinKmh! <= windBestMaxKmh! && windBestMaxKmh! <= windMediumMaxKmh!)) {
		errors.push("Najlepszy zakres wiatru musi mieścić się wewnątrz średniego zakresu.");
	}
	if (professionalWindMinKmh !== null && (weatherProfile !== "wind" || professionalWindMinKmh <= (windBestMaxKmh ?? 0) || professionalWindMinKmh > 100)) {
		errors.push("Próg profesjonalny działa tylko dla aktywności wymagającej wiatru i musi być wyższy od najlepszego zakresu.");
	}
	if (sortOrder === null || sortOrder < 0) {
		errors.push("Nie udało się ustawić kolejności aktywności.");
	}
	if (
		errors.length > 0 ||
		!category ||
		!weatherProfile ||
		quantity === null ||
		durationMinutes === null ||
		sortOrder === null ||
		thresholds.some((item) => item === null)
	) {
		return { errors };
	}

	return {
		data: {
			name,
			description,
			category,
			quantity,
			durationMinutes,
			openTime: BASE_OPEN_TIME,
			closeTime: BASE_CLOSE_TIME,
			notice: text(value.notice),
			active: value.active !== false,
			unavailableWeekends: value.unavailableWeekends === true,
			weatherProfile,
			recommendedStart1,
			recommendedEnd1,
			recommendedStart2,
			recommendedEnd2,
			windMediumMinKmh: windMediumMinKmh!,
			windMediumMaxKmh: windMediumMaxKmh!,
			windBestMinKmh: windBestMinKmh!,
			windBestMaxKmh: windBestMaxKmh!,
			professionalWindMinKmh,
			recommendationNote: text(value.recommendationNote),
			sortOrder,
		},
	};
}

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}
function number(value: unknown) {
	const result = Number(value);
	return Number.isFinite(result) ? result : null;
}
function integer(value: unknown) {
	const result = number(value);
	return result !== null && Number.isInteger(result) ? result : null;
}
function validTime(value: string) {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
