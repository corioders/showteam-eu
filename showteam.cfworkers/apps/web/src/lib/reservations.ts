// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";

export type BookableEquipment = {
	id: number;
	name: string;
	description: string;
	category: string;
	quantity: number;
	durationMinutes: number;
	openTime: string;
	closeTime: string;
	unavailableWeekends: boolean;
	sharedResourceKey?: string;
	notice?: string;
	weatherProfile: WeatherProfile;
	recommendedStart1?: string;
	recommendedEnd1?: string;
	recommendedStart2?: string;
	recommendedEnd2?: string;
	windMediumMinKmh: number;
	windMediumMaxKmh: number;
	windBestMinKmh: number;
	windBestMaxKmh: number;
	professionalWindMinKmh?: number;
	recommendationNote?: string;
	image?: { url?: string | null; alt?: string | null; optimizedImage?: OptimizedImageDescriptor | null } | number | null;
	sortOrder: number;
};

export type WeatherProfile = "any" | "calm" | "wind";

export const BASE_OPEN_TIME = "10:00";
export const BASE_CLOSE_TIME = "20:00";
export const MINIMUM_RESERVATION_MINUTES = 60;

export function todayInPoland(date = new Date()): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Warsaw",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

export function addDaysToBookingDate(value: string, days: number): string {
	const date = new Date(`${value}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function bookingDateChoices(start: string, count = 7): string[] {
	return Array.from({ length: count }, (_, index) => addDaysToBookingDate(start, index));
}

export function timeToMinutes(value: string): number {
	const match = /^(\d{2}):(\d{2})$/.exec(value);
	if (!match) {
		return Number.NaN;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	return hours < 24 && minutes < 60 ? hours * 60 + minutes : Number.NaN;
}

export function minutesToTime(minutes: number): string {
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function createTimeSlots(openTime: string, closeTime: string, durationMinutes: number): string[] {
	const start = timeToMinutes(openTime);
	const end = timeToMinutes(closeTime);
	if (!Number.isFinite(start) || !Number.isFinite(end) || durationMinutes < MINIMUM_RESERVATION_MINUTES || start >= end) {
		return [];
	}
	const slots: string[] = [];
	for (let cursor = start; cursor + durationMinutes <= end; cursor += durationMinutes) {
		slots.push(minutesToTime(cursor));
	}
	return slots;
}

export function isBaseOpenDate(value: string): boolean {
	if (!isBookingDate(value)) {
		return false;
	}
	const monthAndDay = value.slice(5);
	return monthAndDay >= "05-01" && monthAndDay <= "10-31";
}

export function isWeekendDate(value: string): boolean {
	if (!isBookingDate(value)) {
		return false;
	}
	const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
	return weekday === 0 || weekday === 6;
}

export function isActivityOpenDate(value: string, unavailableWeekends: boolean): boolean {
	return isBaseOpenDate(value) && (!unavailableWeekends || !isWeekendDate(value));
}

export function endTime(startTime: string, durationMinutes: number): string {
	return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
	return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function isBookingDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}
	const date = new Date(`${value}T12:00:00Z`);
	return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

export function normalizePhone(value: string): string | null {
	const cleaned = value.trim().replace(/[\s()-]/g, "");
	if (!/^\+?\d{9,15}$/.test(cleaned)) {
		return null;
	}
	if (cleaned.startsWith("+")) {
		return cleaned;
	}
	return cleaned.length === 11 && cleaned.startsWith("48") ? `+${cleaned}` : `+48${cleaned}`;
}

export function isUniqueConstraintError(error: unknown): boolean {
	return error instanceof Error && /unique constraint|constraint failed/i.test(error.message);
}

export function bookingReference(id: string): string {
	return `SHOW-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
