import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { createTimeSlots, endTime, isBookingDate, resolveBookingHours, timeRangesOverlap, todayInPoland, type AvailabilityHoursRule } from "@/lib/reservations";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { getWindForecast, recommendationWindows, recommendSlot } from "@/lib/wind-recommendations";

export async function GET(request: Request) {
  await ensureOperationalTables(database);
  const url = new URL(request.url);
  const equipmentId = Number(url.searchParams.get("equipment"));
  const date = url.searchParams.get("date") || "";
  if (!Number.isInteger(equipmentId) || !isBookingDate(date) || date < todayInPoland()) {
    return Response.json({ error: "Nieprawidłowy sprzęt lub data." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  let equipment;
  try {
    equipment = await payload.findByID({ collection: "equipment", id: equipmentId, overrideAccess: false });
  } catch {
    return Response.json({ error: "Nie znaleziono sprzętu." }, { status: 404 });
  }
  if (!equipment.active) return Response.json({ error: "Ten sprzęt nie jest obecnie dostępny." }, { status: 404 });

  const [hoursRules, reserved, blocked, wind] = await Promise.all([
    database.prepare(`SELECT equipment_id, rule_type, booking_date, weekdays, start_time, end_time, created_at
      FROM availability_hours WHERE (equipment_id IS NULL OR equipment_id = ?) AND (rule_type = 'weekly' OR booking_date = ?)`)
      .bind(equipmentId, date).all<{ equipment_id: number | null; rule_type: "date" | "weekly"; booking_date: string | null; weekdays: string | null; start_time: string; end_time: string; created_at: number }>(),
    database.prepare("SELECT start_time, COUNT(*) AS reserved FROM booking_slots WHERE equipment_id = ? AND booking_date = ? GROUP BY start_time")
      .bind(equipmentId, date).all<{ start_time: string; reserved: number }>(),
    database.prepare("SELECT start_time, end_time FROM availability_blocks WHERE booking_date = ? AND (equipment_id IS NULL OR equipment_id = ?)")
      .bind(date, equipmentId).all<{ start_time: string; end_time: string }>(),
    getWindForecast(date),
  ]);
  const hours = resolveBookingHours(equipment.openTime, equipment.closeTime, equipmentId, date, hoursRules.results.map((rule): AvailabilityHoursRule => ({
    equipmentId: rule.equipment_id, ruleType: rule.rule_type, bookingDate: rule.booking_date, weekdays: rule.weekdays,
    startTime: rule.start_time, endTime: rule.end_time, createdAt: rule.created_at,
  })));

  const counts = new Map(reserved.results.map((row) => [row.start_time, Number(row.reserved)]));
  const forecastByHour = new Map(wind.hours.map((hour) => [hour.time.slice(11, 13), hour]));
  const windows = recommendationWindows(equipment);
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const slots = createTimeSlots(hours.openTime, hours.closeTime, equipment.durationMinutes)
    .filter((time) => date !== todayInPoland() || time > currentTime)
    .filter((time) => !blocked.results.some((block) => timeRangesOverlap(time, endTime(time, equipment.durationMinutes), block.start_time, block.end_time)))
    .map((time) => ({
      time,
      available: Math.max(0, equipment.quantity - (counts.get(time) || 0)),
      recommendation: recommendSlot({ time, durationMinutes: equipment.durationMinutes, profile: equipment.weatherProfile, windows, forecast: forecastByHour.get(time.slice(0, 2)) }),
    }))
    .filter((slot) => slot.available > 0);
  return Response.json({ slots, durationMinutes: equipment.durationMinutes, openTime: hours.openTime, closeTime: hours.closeTime, windStatus: wind.status, recommendationNote: equipment.recommendationNote || null }, { headers: { "Cache-Control": "no-store" } });
}
