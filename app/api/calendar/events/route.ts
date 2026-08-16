import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { tvCookie, tvCookieName, verifyTvToken } from "@/lib/tv-auth";
import { ensureOperationalTables } from "@/lib/operational-tables";

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function GET(request: Request) {
  await ensureOperationalTables(database);
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  const tvToken = cookieValue(request.headers.get("cookie"), tvCookieName);
  const tvAuthorized = await verifyTvToken(database, tvToken);
  if (!user && !tvAuthorized) return Response.json({ error: "Brak dostępu." }, { status: 401 });

  const url = new URL(request.url);
  const start = (url.searchParams.get("start") || "0000-01-01").slice(0, 10);
  const end = (url.searchParams.get("end") || "9999-12-31").slice(0, 10);
  const result = await payload.find({
    collection: "bookings",
    overrideAccess: true,
    depth: 1,
    limit: 1000,
    sort: "bookingDate",
    where: { and: [{ bookingDate: { greater_than_equal: start } }, { bookingDate: { less_than: end } }, { status: { not_equals: "cancelled" } }] },
  });
  const blocks = await database.prepare(`SELECT availability_blocks.id, availability_blocks.booking_date, availability_blocks.start_time,
    availability_blocks.end_time, availability_blocks.reason, equipment.name AS equipment_name
    FROM availability_blocks LEFT JOIN equipment ON equipment.id = availability_blocks.equipment_id
    WHERE availability_blocks.booking_date >= ? AND availability_blocks.booking_date < ? ORDER BY availability_blocks.booking_date, availability_blocks.start_time`)
    .bind(start, end).all<{ id: string; booking_date: string; start_time: string; end_time: string; reason: string | null; equipment_name: string | null }>();
  const exceptions = await database.prepare(`SELECT availability_hours.id, availability_hours.booking_date, availability_hours.start_time,
    availability_hours.end_time, availability_hours.name, equipment.name AS equipment_name
    FROM availability_hours LEFT JOIN equipment ON equipment.id = availability_hours.equipment_id
    WHERE availability_hours.rule_type = 'date' AND availability_hours.booking_date >= ? AND availability_hours.booking_date < ?
    ORDER BY availability_hours.booking_date, availability_hours.start_time`)
    .bind(start, end).all<{ id: string; booking_date: string; start_time: string; end_time: string; name: string | null; equipment_name: string | null }>();
  const bookingEvents = result.docs.map((booking) => {
    const equipment = typeof booking.equipment === "object" ? booking.equipment : null;
    return {
      id: String(booking.id),
      title: `${equipment?.name || "Sprzęt"} · ${booking.customerName}`,
      start: `${booking.bookingDate}T${booking.startTime}:00`,
      end: `${booking.bookingDate}T${booking.endTime}:00`,
      extendedProps: { kind: "booking", reference: booking.reference, phone: booking.phone, email: booking.email || "", status: booking.status, notes: booking.staffNotes || booking.customerNotes || "" },
    };
  });
  const blockEvents = blocks.results.map((block) => ({
    id: `block:${block.id}`,
    title: `BLOKADA · ${block.equipment_name || "Wszystkie sprzęty"}`,
    start: `${block.booking_date}T${block.start_time}:00`,
    end: `${block.booking_date}T${block.end_time}:00`,
    backgroundColor: "#555b61",
    borderColor: "#777d83",
    textColor: "#ffffff",
    extendedProps: { kind: "block", reference: "BLOKADA", phone: "", email: "", status: "blocked", notes: block.reason || "" },
  }));
  const exceptionEvents = exceptions.results.map((exception) => ({
    id: `hours:${exception.id}`,
    title: `WYJĄTEK · ${exception.equipment_name || "Cała baza"} · ${exception.start_time}–${exception.end_time}`,
    start: `${exception.booking_date}T${exception.start_time}:00`,
    end: `${exception.booking_date}T${exception.end_time}:00`,
    backgroundColor: "#126782",
    borderColor: "#48cae4",
    textColor: "#ffffff",
    extendedProps: { kind: "availability", reference: "GODZINY BAZY", phone: "", email: "", status: "availability", notes: exception.name || "Wyjątkowe godziny wynajmu w tym dniu." },
  }));
  const response = Response.json([...bookingEvents, ...blockEvents, ...exceptionEvents], { headers: { "Cache-Control": "no-store" } });
  if (tvAuthorized && tvToken) response.headers.append("Set-Cookie", tvCookie(tvToken));
  return response;
}
