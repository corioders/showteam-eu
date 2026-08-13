import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { bookingReference, createTimeSlots, endTime, isBookingDate, isUniqueConstraintError, normalizePhone } from "@/lib/reservations";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { checkRateLimit } from "@/lib/rate-limit";

type ReservationInput = {
  equipmentId?: unknown;
  date?: unknown;
  time?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  notes?: unknown;
  website?: unknown;
};

function todayInPoland() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function POST(request: Request) {
  await ensureOperationalTables(database);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nieprawidłowe źródło żądania." }, { status: 403 });
  const rateLimit = await checkRateLimit(database, request, "reservation", 10, 60 * 60);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Za dużo prób. Spróbuj ponownie później lub zadzwoń do nas." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let input: ReservationInput;
  try { input = await request.json() as ReservationInput; }
  catch { return Response.json({ error: "Nieprawidłowe dane." }, { status: 400 }); }
  if (input.website) return Response.json({ error: "Nie udało się zapisać rezerwacji." }, { status: 400 });

  const equipmentId = Number(input.equipmentId);
  const date = String(input.date || "");
  const time = String(input.time || "");
  const name = String(input.name || "").trim().slice(0, 120);
  const phone = normalizePhone(String(input.phone || ""));
  const email = String(input.email || "").trim().toLowerCase().slice(0, 200);
  const notes = String(input.notes || "").trim().slice(0, 500);
  if (!Number.isInteger(equipmentId) || !isBookingDate(date) || date < todayInPoland() || name.length < 2 || !phone || (email && !/^\S+@\S+\.\S+$/.test(email))) {
    return Response.json({ error: "Sprawdź datę, imię, telefon i e-mail." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  let equipment;
  try { equipment = await payload.findByID({ collection: "equipment", id: equipmentId, overrideAccess: false }); }
  catch { return Response.json({ error: "Nie znaleziono sprzętu." }, { status: 404 }); }
  if (!equipment.active || !createTimeSlots(equipment.openTime, equipment.closeTime, equipment.durationMinutes).includes(time)) {
    return Response.json({ error: "Wybrany termin jest niedostępny." }, { status: 409 });
  }

  const duplicate = await payload.count({
    collection: "bookings",
    where: { and: [{ phone: { equals: phone } }, { bookingDate: { equals: date } }, { status: { not_equals: "cancelled" } }] },
    overrideAccess: true,
  });
  if (duplicate.totalDocs >= 5) return Response.json({ error: "Dla tego numeru jest już kilka rezerwacji tego dnia. Zadzwoń do nas." }, { status: 429 });

  const reservationId = crypto.randomUUID();
  let allocatedUnit: number | null = null;
  for (let unit = 1; unit <= equipment.quantity; unit += 1) {
    try {
      await database.prepare("INSERT INTO booking_slots (equipment_id, booking_date, start_time, unit_number, reservation_id) VALUES (?, ?, ?, ?, ?)")
        .bind(equipmentId, date, time, unit, reservationId).run();
      allocatedUnit = unit;
      break;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      payload.logger.error({ err: error, msg: "Reservation slot allocation failed" });
      return Response.json({ error: "Nie udało się sprawdzić terminu. Spróbuj ponownie." }, { status: 500 });
    }
  }
  if (!allocatedUnit) return Response.json({ error: "Ten termin właśnie został zajęty. Wybierz inny." }, { status: 409 });

  const reference = bookingReference(reservationId);
  try {
    await payload.create({
      collection: "bookings",
      overrideAccess: true,
      data: {
        reference, reservationId, equipment: equipmentId, bookingDate: date, startTime: time,
        endTime: endTime(time, equipment.durationMinutes), customerName: name, phone,
        email: email || undefined, customerNotes: notes || undefined, status: "confirmed", source: "website",
      },
    });
  } catch (error) {
    await database.prepare("DELETE FROM booking_slots WHERE reservation_id = ?").bind(reservationId).run();
    payload.logger.error({ err: error, msg: "Reservation creation failed" });
    return Response.json({ error: "Nie udało się zapisać rezerwacji. Spróbuj ponownie." }, { status: 500 });
  }
  return Response.json({ reference, equipment: equipment.name, date, time, endTime: endTime(time, equipment.durationMinutes) }, { status: 201 });
}
