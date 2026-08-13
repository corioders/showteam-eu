import { getPayload } from "payload";
import config, { database } from "@payload-config";

type TrafficTotals = { views_30d: number; views_today: number };
type BookingTotals = { created_30d: number; upcoming: number; completed_30d: number; cancelled_30d: number };
type RankingRow = { name: string; value: number };

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  if (!(await payload.auth({ headers: request.headers })).user) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });

  const traffic = await database.prepare(`SELECT
    COALESCE(SUM(views), 0) AS views_30d,
    COALESCE(SUM(CASE WHEN day = date('now') THEN views ELSE 0 END), 0) AS views_today
    FROM analytics WHERE day >= date('now', '-29 days')`).first<TrafficTotals>();
  const bookings = await database.prepare(`SELECT
    COALESCE(SUM(CASE WHEN substr(created_at, 1, 10) >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS created_30d,
    COALESCE(SUM(CASE WHEN status = 'confirmed' AND booking_date >= date('now') THEN 1 ELSE 0 END), 0) AS upcoming,
    COALESCE(SUM(CASE WHEN status = 'completed' AND booking_date >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS completed_30d,
    COALESCE(SUM(CASE WHEN status = 'cancelled' AND substr(created_at, 1, 10) >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS cancelled_30d
    FROM bookings`).first<BookingTotals>();
  const equipment = await database.prepare(`SELECT equipment.name AS name, COUNT(*) AS value
    FROM bookings JOIN equipment ON equipment.id = bookings.equipment_id
    WHERE substr(bookings.created_at, 1, 10) >= date('now', '-29 days') AND bookings.status != 'cancelled'
    GROUP BY equipment.id, equipment.name ORDER BY value DESC, equipment.name LIMIT 8`).all<RankingRow>();
  const pages = await database.prepare(`SELECT path AS name, SUM(views) AS value FROM analytics
    WHERE day >= date('now', '-29 days') GROUP BY path ORDER BY value DESC, path LIMIT 8`).all<RankingRow>();

  return Response.json({
    traffic: traffic || { views_30d: 0, views_today: 0 },
    bookings: bookings || { created_30d: 0, upcoming: 0, completed_30d: 0, cancelled_30d: 0 },
    equipment: equipment.results,
    pages: pages.results,
    generatedAt: Date.now(),
  }, { headers: { "Cache-Control": "no-store" } });
}
