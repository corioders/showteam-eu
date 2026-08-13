import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { ensureOperationalTables } from "@/lib/operational-tables";
import { isBookingDate, timeToMinutes, todayInPoland } from "@/lib/reservations";

async function adminPayload(request: Request) {
  const payload = await getPayload({ config });
  return (await payload.auth({ headers: request.headers })).user ? payload : null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const payload = await adminPayload(request);
  if (!payload) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  await ensureOperationalTables(database);
  const [equipment, blocks] = await Promise.all([
    payload.find({ collection: "equipment", overrideAccess: true, limit: 100, sort: "name" }),
    database.prepare(`SELECT id, equipment_id, booking_date, start_time, end_time, reason, created_at
      FROM availability_blocks WHERE booking_date >= ? ORDER BY booking_date, start_time LIMIT 1000`)
      .bind(todayInPoland()).all<{ id: string; equipment_id: number | null; booking_date: string; start_time: string; end_time: string; reason: string | null; created_at: number }>(),
  ]);
  const equipmentNames = new Map(equipment.docs.map((item) => [Number(item.id), item.name]));
  return Response.json({
    equipment: equipment.docs.map((item) => ({ id: Number(item.id), name: item.name })),
    blocks: blocks.results.map((block) => ({ ...block, equipment_name: block.equipment_id === null ? "Wszystkie sprzęty" : equipmentNames.get(block.equipment_id) || "Usunięty sprzęt" })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  const payload = await adminPayload(request);
  if (!payload) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const equipmentId = input.equipmentId === "all" ? null : Number(input.equipmentId);
  const bookingDate = String(input.bookingDate || "");
  const startTime = String(input.startTime || "");
  const endTime = String(input.endTime || "");
  const reason = String(input.reason || "").trim().slice(0, 160);
  if ((equipmentId !== null && !Number.isInteger(equipmentId)) || !isBookingDate(bookingDate) || bookingDate < todayInPoland() || !Number.isFinite(timeToMinutes(startTime)) || !Number.isFinite(timeToMinutes(endTime)) || timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return Response.json({ error: "Sprawdź sprzęt, datę i godziny blokady." }, { status: 400 });
  }
  let equipmentName = "Wszystkie sprzęty";
  if (equipmentId !== null) {
    try {
      equipmentName = (await payload.findByID({ collection: "equipment", id: equipmentId, overrideAccess: true })).name;
    } catch {
      return Response.json({ error: "Nie znaleziono sprzętu." }, { status: 404 });
    }
  }
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await ensureOperationalTables(database);
  const existingBlock = await database.prepare(`SELECT id FROM availability_blocks
    WHERE booking_date = ? AND start_time < ? AND end_time > ? AND (equipment_id IS NULL OR ? IS NULL OR equipment_id = ?) LIMIT 1`)
    .bind(bookingDate, endTime, startTime, equipmentId, equipmentId).first();
  if (existingBlock) return Response.json({ error: "Ten zakres jest już zablokowany." }, { status: 409 });
  const existingBooking = await database.prepare(`SELECT reference FROM bookings
    WHERE booking_date = ? AND status != 'cancelled' AND start_time < ? AND end_time > ? AND (? IS NULL OR equipment_id = ?) LIMIT 1`)
    .bind(bookingDate, endTime, startTime, equipmentId, equipmentId).first<{ reference: string }>();
  if (existingBooking) return Response.json({ error: `W tym czasie jest już rezerwacja ${existingBooking.reference}. Najpierw ją sprawdź lub anuluj.` }, { status: 409 });
  const insertion = await database.prepare(`INSERT INTO availability_blocks (id, equipment_id, booking_date, start_time, end_time, reason, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM availability_blocks WHERE booking_date = ? AND start_time < ? AND end_time > ? AND (equipment_id IS NULL OR ? IS NULL OR equipment_id = ?)
    ) AND NOT EXISTS (
      SELECT 1 FROM booking_slots JOIN equipment ON equipment.id = booking_slots.equipment_id
      WHERE booking_slots.booking_date = ? AND (? IS NULL OR booking_slots.equipment_id = ?)
      AND (CAST(substr(booking_slots.start_time, 1, 2) AS integer) * 60 + CAST(substr(booking_slots.start_time, 4, 2) AS integer)) < ?
      AND (CAST(substr(booking_slots.start_time, 1, 2) AS integer) * 60 + CAST(substr(booking_slots.start_time, 4, 2) AS integer) + equipment.duration_minutes) > ?
    )`).bind(
      id, equipmentId, bookingDate, startTime, endTime, reason || null, createdAt,
      bookingDate, endTime, startTime, equipmentId, equipmentId,
      bookingDate, equipmentId, equipmentId, timeToMinutes(endTime), timeToMinutes(startTime),
    ).run();
  if (!insertion.meta.changes) return Response.json({ error: "Termin został właśnie zajęty albo zablokowany. Odśwież kalendarz i wybierz inny zakres." }, { status: 409 });
  return Response.json({ id, equipment_id: equipmentId, equipment_name: equipmentName, booking_date: bookingDate, start_time: startTime, end_time: endTime, reason: reason || null, created_at: createdAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  if (!await adminPayload(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as { id?: unknown };
  const id = String(input.id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Nieprawidłowa blokada." }, { status: 400 });
  await ensureOperationalTables(database);
  await database.prepare("DELETE FROM availability_blocks WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
