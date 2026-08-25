import { addDaysToBookingDate, endTime, timeRangesOverlap, todayInPoland, type WeatherProfile } from "./reservations";

const lakeLatitude = 49.97635;
const lakeLongitude = 18.87813;
const forecastRangeDays = 7;

export type WindHour = { time: string; speedKmh: number; gustKmh: number };
export type WindForecast = { status: "forecast" | "outside-range" | "unavailable"; hours: WindHour[] };
export type RecommendationLevel = "best" | "medium" | "poor" | "professional";
export type WindThresholds = {
	mediumMinKmh: number;
	mediumMaxKmh: number;
	bestMinKmh: number;
	bestMaxKmh: number;
	professionalMinKmh?: number | null;
};
export type SlotRecommendation = {
	recommended: boolean;
	level: RecommendationLevel;
	basis: "forecast" | "typical" | "none";
	label?: string;
	detail?: string;
	windKmh?: number;
	gustKmh?: number;
};

type RecommendInput = {
	time: string;
	durationMinutes: number;
	profile: WeatherProfile;
	windows: { start: string; end: string }[];
	thresholds: WindThresholds;
	forecast?: WindHour;
};

export function recommendSlot({ time, durationMinutes, profile, windows, thresholds, forecast }: RecommendInput): SlotRecommendation {
	if (profile === "any") {
		return {
			recommended: true,
			level: "best",
			basis: forecast ? "forecast" : "none",
			label: "Dobry w każdy warun",
			detail: "Ten sprzęt nie wymaga konkretnego wiatru.",
			windKmh: forecast?.speedKmh,
			gustKmh: forecast?.gustKmh,
		};
	}
	const inPreferredWindow = windows.length === 0 || windows.some((window) => timeRangesOverlap(time, endTime(time, durationMinutes), window.start, window.end));

	if (!forecast) {
		return inPreferredWindow
			? {
					recommended: true,
					level: "medium",
					basis: "typical",
					label: "Średni warun",
					detail: "Zwykle dobra godzina ustawiona przez ekipę SHOWteam. Prognoza pojawi się bliżej terminu.",
				}
			: { recommended: false, level: "poor", basis: "typical", label: "Słaby warun", detail: "Poza godzinami zwykle polecanymi dla tego sprzętu." };
	}

	const bestConditions = forecast.speedKmh >= thresholds.bestMinKmh && forecast.speedKmh <= thresholds.bestMaxKmh;
	const mediumConditions = forecast.speedKmh >= thresholds.mediumMinKmh && forecast.speedKmh <= thresholds.mediumMaxKmh;
	if (profile === "wind" && thresholds.professionalMinKmh != null && forecast.speedKmh >= thresholds.professionalMinKmh) {
		return {
			recommended: false,
			level: "professional",
			basis: "forecast",
			label: "Warun profesjonalny",
			detail: `Bardzo mocny wiatr: ${Math.round(forecast.speedKmh)} km/h, porywy ${Math.round(forecast.gustKmh)} km/h. Tylko dla doświadczonych.`,
			windKmh: forecast.speedKmh,
			gustKmh: forecast.gustKmh,
		};
	}
	const condition = profile === "calm" ? "spokojna woda" : profile === "wind" ? "wiatr do żeglowania" : "warunki bez szczególnych wymagań";
	if (bestConditions && inPreferredWindow) {
		return {
			recommended: true,
			level: "best",
			basis: "forecast",
			label: "Najlepszy warun",
			detail: `Prognoza: ${condition}, wiatr ${Math.round(forecast.speedKmh)} km/h.`,
			windKmh: forecast.speedKmh,
			gustKmh: forecast.gustKmh,
		};
	}
	if (mediumConditions) {
		return {
			recommended: true,
			level: "medium",
			basis: "forecast",
			label: "Średni warun",
			detail: `Prognozowany wiatr: ${Math.round(forecast.speedKmh)} km/h.`,
			windKmh: forecast.speedKmh,
			gustKmh: forecast.gustKmh,
		};
	}
	return {
		recommended: false,
		level: "poor",
		basis: "forecast",
		label: "Słaby warun",
		detail: `Warunki są słabsze dla tego sprzętu. Prognozowany wiatr: ${Math.round(forecast.speedKmh)} km/h.`,
		windKmh: forecast.speedKmh,
		gustKmh: forecast.gustKmh,
	};
}

export function recommendationWindows(equipment: {
	recommendedStart1?: string | null;
	recommendedEnd1?: string | null;
	recommendedStart2?: string | null;
	recommendedEnd2?: string | null;
}) {
	return [
		{ start: equipment.recommendedStart1, end: equipment.recommendedEnd1 },
		{ start: equipment.recommendedStart2, end: equipment.recommendedEnd2 },
	].flatMap(({ start, end }) => (start && end ? [{ start, end }] : []));
}

export function isWindForecastDate(date: string, today = todayInPoland()) {
	return date >= today && date <= addDaysToBookingDate(today, forecastRangeDays);
}

export function weatherProfileLabel(profile: WeatherProfile) {
	if (profile === "calm") {
		return "Najlepszy warun · spokojna woda";
	}
	if (profile === "wind") {
		return "Najlepszy warun · wiatr";
	}
	return "Dobry w każdy warun";
}

export async function getWindForecast(date: string): Promise<WindForecast> {
	const today = todayInPoland();
	if (!isWindForecastDate(date, today)) {
		return { status: "outside-range", hours: [] };
	}
	const params = new URLSearchParams({
		latitude: String(lakeLatitude),
		longitude: String(lakeLongitude),
		hourly: "wind_speed_10m,wind_gusts_10m",
		wind_speed_unit: "kmh",
		timezone: "Europe/Warsaw",
		start_date: date,
		end_date: date,
	});
	try {
		const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4_000) });
		if (!response.ok) {
			return { status: "unavailable", hours: [] };
		}
		const body = (await response.json()) as { hourly?: { time?: string[]; wind_speed_10m?: number[]; wind_gusts_10m?: number[] } };
		const times = body.hourly?.time || [];
		const speeds = body.hourly?.wind_speed_10m || [];
		const gusts = body.hourly?.wind_gusts_10m || [];
		if (times.length === 0 || times.length !== speeds.length || times.length !== gusts.length) {
			return { status: "unavailable", hours: [] };
		}
		return { status: "forecast", hours: times.map((time, index) => ({ time, speedKmh: speeds[index], gustKmh: gusts[index] })) };
	} catch {
		return { status: "unavailable", hours: [] };
	}
}
