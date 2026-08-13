import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { createTimeSlots, isBookingDate } from "@/lib/reservations";

function todayInPoland() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function GET(request: Request) {
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

  const reserved = await database.prepare(
    "SELECT start_time, COUNT(*) AS reserved FROM booking_slots WHERE equipment_id = ? AND booking_date = ? GROUP BY start_time",
  ).bind(equipmentId, date).all<{ start_time: string; reserved: number }>();
  const counts = new Map(reserved.results.map((row) => [row.start_time, Number(row.reserved)]));
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const slots = createTimeSlots(equipment.openTime, equipment.closeTime, equipment.durationMinutes)
    .filter((time) => date !== todayInPoland() || time > currentTime)
    .map((time) => ({ time, available: Math.max(0, equipment.quantity - (counts.get(time) || 0)) }))
    .filter((slot) => slot.available > 0);
  return Response.json({ slots, durationMinutes: equipment.durationMinutes }, { headers: { "Cache-Control": "no-store" } });
}
