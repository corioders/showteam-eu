export type BookableEquipment = {
  id: number;
  name: string;
  description: string;
  category: string;
  quantity: number;
  durationMinutes: number;
  openTime: string;
  closeTime: string;
  notice?: string;
  image?: { url?: string | null; alt?: string | null } | number | null;
};

export function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
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
  if (!Number.isFinite(start) || !Number.isFinite(end) || durationMinutes < 15 || start >= end) return [];
  const slots: string[] = [];
  for (let cursor = start; cursor + durationMinutes <= end; cursor += durationMinutes) slots.push(minutesToTime(cursor));
  return slots;
}

export function endTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function isBookingDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

export function normalizePhone(value: string): string | null {
  const cleaned = value.trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d{9,15}$/.test(cleaned)) return null;
  return cleaned.startsWith("+") ? cleaned : `+48${cleaned}`;
}

export function bookingReference(id: string): string {
  return `SHOW-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
