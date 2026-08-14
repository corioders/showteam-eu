import { addDaysToBookingDate, endTime, timeRangesOverlap, todayInPoland, type WeatherProfile } from "./reservations";

const lakeLatitude = 49.97635;
const lakeLongitude = 18.87813;
const calmMaximumKmh = 10;
const windMinimumKmh = 12;
const forecastRangeDays = 7;

export type WindHour = { time: string; speedKmh: number; gustKmh: number };
export type WindForecast = { status: "forecast" | "outside-range" | "unavailable"; hours: WindHour[] };
export type SlotRecommendation = {
  recommended: boolean;
  level: "best" | "good" | "regular";
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
  forecast?: WindHour;
};

export function recommendSlot({ time, durationMinutes, profile, windows, forecast }: RecommendInput): SlotRecommendation {
  if (profile === "any" && !windows.length) return { recommended: false, level: "regular", basis: "none" };
  const inPreferredWindow = !windows.length || windows.some((window) => timeRangesOverlap(time, endTime(time, durationMinutes), window.start, window.end));

  if (!forecast) {
    return inPreferredWindow
      ? { recommended: true, level: "good", basis: "typical", label: "Zwykle dobry moment", detail: "Polecana godzina ustawiona przez ekipę SHOWteam." }
      : { recommended: false, level: "regular", basis: "typical" };
  }

  const weatherMatches = profile === "any" || (profile === "calm" ? forecast.speedKmh <= calmMaximumKmh : forecast.speedKmh >= windMinimumKmh);
  const condition = profile === "calm" ? "spokojna woda" : profile === "wind" ? "wiatr do żeglowania" : "warunki bez szczególnych wymagań";
  if (weatherMatches && inPreferredWindow) return { recommended: true, level: "best", basis: "forecast", label: "Najlepszy warun", detail: `Prognoza: ${condition}, wiatr ${Math.round(forecast.speedKmh)} km/h.`, windKmh: forecast.speedKmh, gustKmh: forecast.gustKmh };
  if (weatherMatches) return { recommended: true, level: "good", basis: "forecast", label: "Dobry warun", detail: `Prognoza: ${condition}, wiatr ${Math.round(forecast.speedKmh)} km/h.`, windKmh: forecast.speedKmh, gustKmh: forecast.gustKmh };
  return { recommended: false, level: "regular", basis: "forecast", detail: `Prognozowany wiatr: ${Math.round(forecast.speedKmh)} km/h.`, windKmh: forecast.speedKmh, gustKmh: forecast.gustKmh };
}

export function recommendationWindows(equipment: { recommendedStart1?: string | null; recommendedEnd1?: string | null; recommendedStart2?: string | null; recommendedEnd2?: string | null }) {
  return [
    { start: equipment.recommendedStart1, end: equipment.recommendedEnd1 },
    { start: equipment.recommendedStart2, end: equipment.recommendedEnd2 },
  ].flatMap(({ start, end }) => start && end ? [{ start, end }] : []);
}

export function isWindForecastDate(date: string, today = todayInPoland()) {
  return date >= today && date <= addDaysToBookingDate(today, forecastRangeDays);
}

export function weatherProfileLabel(profile: WeatherProfile) {
  if (profile === "calm") return "Najlepszy warun · spokojna woda";
  if (profile === "wind") return "Najlepszy warun · wiatr";
  return "Dobry w każdy warun";
}

export async function getWindForecast(date: string): Promise<WindForecast> {
  const today = todayInPoland();
  if (!isWindForecastDate(date, today)) return { status: "outside-range", hours: [] };
  const params = new URLSearchParams({
    latitude: String(lakeLatitude), longitude: String(lakeLongitude),
    hourly: "wind_speed_10m,wind_gusts_10m", wind_speed_unit: "kmh",
    timezone: "Europe/Warsaw", start_date: date, end_date: date,
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4_000) });
    if (!response.ok) return { status: "unavailable", hours: [] };
    const body = await response.json() as { hourly?: { time?: string[]; wind_speed_10m?: number[]; wind_gusts_10m?: number[] } };
    const times = body.hourly?.time || [];
    const speeds = body.hourly?.wind_speed_10m || [];
    const gusts = body.hourly?.wind_gusts_10m || [];
    if (!times.length || times.length !== speeds.length || times.length !== gusts.length) return { status: "unavailable", hours: [] };
    return { status: "forecast", hours: times.map((time, index) => ({ time, speedKmh: speeds[index], gustKmh: gusts[index] })) };
  } catch {
    return { status: "unavailable", hours: [] };
  }
}
