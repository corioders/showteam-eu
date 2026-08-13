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
  const [equipment, rules] = await Promise.all([
    payload.find({ collection: "equipment", overrideAccess: true, limit: 100, sort: "name" }),
    database.prepare(`SELECT id, equipment_id, rule_type, booking_date, weekdays, start_time, end_time, name, created_at
      FROM availability_hours WHERE rule_type = 'weekly' OR booking_date >= ? ORDER BY created_at DESC LIMIT 1000`)
      .bind(todayInPoland()).all<{ id: string; equipment_id: number | null; rule_type: "date" | "weekly"; booking_date: string | null; weekdays: string | null; start_time: string; end_time: string; name: string | null; created_at: number }>(),
  ]);
  const equipmentNames = new Map(equipment.docs.map((item) => [Number(item.id), item.name]));
  return Response.json({
    equipment: equipment.docs.map((item) => ({ id: Number(item.id), name: item.name })),
    rules: rules.results.map((rule) => ({ ...rule, equipment_name: rule.equipment_id === null ? "Wszystkie sprzęty" : equipmentNames.get(rule.equipment_id) || "Usunięty sprzęt" })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  const payload = await adminPayload(request);
  if (!payload) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const equipmentId = input.equipmentId === "all" ? null : Number(input.equipmentId);
  const ruleType = input.ruleType === "weekly" ? "weekly" : input.ruleType === "date" ? "date" : null;
  const bookingDate = ruleType === "date" ? String(input.bookingDate || "") : null;
  const weekdays = ruleType === "weekly" && Array.isArray(input.weekdays)
    ? [...new Set(input.weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort().join(",")
    : null;
  const startTime = String(input.startTime || "");
  const endTime = String(input.endTime || "");
  const name = String(input.name || "").trim().slice(0, 80);
  if ((equipmentId !== null && !Number.isInteger(equipmentId)) || !ruleType || (ruleType === "date" && (!bookingDate || !isBookingDate(bookingDate) || bookingDate < todayInPoland())) || (ruleType === "weekly" && !weekdays) || !Number.isFinite(timeToMinutes(startTime)) || !Number.isFinite(timeToMinutes(endTime)) || timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return Response.json({ error: "Sprawdź sprzęt, dni i godziny dostępności." }, { status: 400 });
  }
  let equipmentName = "Wszystkie sprzęty";
  if (equipmentId !== null) {
    try { equipmentName = (await payload.findByID({ collection: "equipment", id: equipmentId, overrideAccess: true })).name; }
    catch { return Response.json({ error: "Nie znaleziono sprzętu." }, { status: 404 }); }
  }
  await ensureOperationalTables(database);
  const equipmentCondition = equipmentId === null ? "equipment_id IS NULL" : "equipment_id = ?";
  const targetBindings: number[] = equipmentId === null ? [] : [equipmentId];
  const conflictBase = `SELECT reference FROM bookings WHERE status != 'cancelled' AND ${equipmentId === null ? "1 = 1" : "equipment_id = ?"} AND (start_time < ? OR end_time > ?)`;
  let conflict;
  if (ruleType === "date") {
    conflict = await database.prepare(`${conflictBase} AND booking_date = ? LIMIT 1`).bind(...targetBindings, startTime, endTime, bookingDate).first<{ reference: string }>();
  } else {
    const days = weekdays!.split(",").map(Number);
    const placeholders = days.map(() => "?").join(",");
    conflict = await database.prepare(`${conflictBase} AND booking_date >= ? AND CAST(strftime('%w', booking_date) AS integer) IN (${placeholders}) LIMIT 1`)
      .bind(...targetBindings, startTime, endTime, todayInPoland(), ...days).first<{ reference: string }>();
  }
  if (conflict) return Response.json({ error: `Rezerwacja ${conflict.reference} wypada poza nowymi godzinami. Najpierw ją sprawdź lub anuluj.` }, { status: 409 });

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const targetColumn = ruleType === "date" ? "booking_date" : "weekdays";
  const targetValue = ruleType === "date" ? bookingDate : weekdays;
  await database.batch([
    database.prepare(`DELETE FROM availability_hours WHERE rule_type = ? AND ${equipmentCondition} AND ${targetColumn} = ?`).bind(ruleType, ...targetBindings, targetValue),
    database.prepare("INSERT INTO availability_hours (id, equipment_id, rule_type, booking_date, weekdays, start_time, end_time, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, equipmentId, ruleType, bookingDate, weekdays, startTime, endTime, name || null, createdAt),
  ]);
  return Response.json({ id, equipment_id: equipmentId, equipment_name: equipmentName, rule_type: ruleType, booking_date: bookingDate, weekdays, start_time: startTime, end_time: endTime, name: name || null, created_at: createdAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Nieprawidłowe źródło." }, { status: 403 });
  if (!await adminPayload(request)) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as { id?: unknown };
  const id = String(input.id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Nieprawidłowa reguła." }, { status: 400 });
  await ensureOperationalTables(database);
  await database.prepare("DELETE FROM availability_hours WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
