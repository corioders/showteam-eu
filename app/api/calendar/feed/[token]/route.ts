import { database } from "@payload-config";
import { buildCalendarFeed, type CalendarBlock, type CalendarBooking } from "@/lib/calendar-feed";
import { ensureOperationalTables } from "@/lib/operational-tables";

async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rawToken = (await params).token;
  const token = rawToken.endsWith(".ics") ? rawToken.slice(0, -4) : "";
  const [id, secret, extra] = token.split(".");
  if (extra || !/^[0-9a-f-]{36}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
    return new Response("Nieprawidłowy link kalendarza.", { status: 401 });
  }

  await ensureOperationalTables(database);
  const feed = await database.prepare("SELECT token_hash FROM calendar_feeds WHERE id = ?").bind(id).first<{ token_hash: string }>();
  if (!feed || feed.token_hash !== await hashSecret(secret)) return new Response("Link kalendarza został wyłączony.", { status: 401 });

  const bookings = await database.prepare(`SELECT
    bookings.reservation_id, bookings.reference, equipment.name AS equipment_name,
    bookings.booking_date, bookings.start_time, bookings.end_time,
    bookings.customer_name, bookings.phone, bookings.status,
    bookings.customer_notes, bookings.staff_notes, bookings.updated_at
    FROM bookings JOIN equipment ON equipment.id = bookings.equipment_id
    WHERE bookings.status != 'cancelled'
    ORDER BY bookings.booking_date, bookings.start_time
    LIMIT 5000`).all<CalendarBooking>();
  const blocks = await database.prepare(`SELECT availability_blocks.id, equipment.name AS equipment_name,
    availability_blocks.booking_date, availability_blocks.start_time, availability_blocks.end_time,
    availability_blocks.reason, availability_blocks.created_at
    FROM availability_blocks LEFT JOIN equipment ON equipment.id = availability_blocks.equipment_id
    ORDER BY availability_blocks.booking_date, availability_blocks.start_time
    LIMIT 5000`).all<CalendarBlock>();

  return new Response(buildCalendarFeed(bookings.results, new Date(), blocks.results), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline; filename=showteam-rezerwacje.ics",
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}
