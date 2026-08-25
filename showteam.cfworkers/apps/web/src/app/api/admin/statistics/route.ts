// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
import config, { database } from "@payload-config";
import { getPayload } from "payload";

type TrafficTotals = { views_30d: number; views_today: number };
type BookingTotals = { created_30d: number; upcoming: number; completed_30d: number; cancelled_30d: number };
type ApplicationTotals = { created_30d: number; returning_30d: number; participants_total: number; newsletter_total: number };
type RankingRow = { name: string; value: number };

export async function GET(request: Request) {
	const payload = await getPayload({ config });
	if (!(await payload.auth({ headers: request.headers })).user) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}

	const traffic = await database
		.prepare(`SELECT
    COALESCE(SUM(views), 0) AS views_30d,
    COALESCE(SUM(CASE WHEN day = date('now') THEN views ELSE 0 END), 0) AS views_today
    FROM analytics WHERE day >= date('now', '-29 days')`)
		.first<TrafficTotals>();
	const bookings = await database
		.prepare(`SELECT
    COALESCE(SUM(CASE WHEN substr(created_at, 1, 10) >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS created_30d,
    COALESCE(SUM(CASE WHEN status = 'confirmed' AND booking_date >= date('now') THEN 1 ELSE 0 END), 0) AS upcoming,
    COALESCE(SUM(CASE WHEN status = 'completed' AND booking_date >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS completed_30d,
    COALESCE(SUM(CASE WHEN status = 'cancelled' AND substr(created_at, 1, 10) >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS cancelled_30d
    FROM bookings`)
		.first<BookingTotals>();
	const equipment = await database
		.prepare(`SELECT equipment.name AS name, COUNT(*) AS value
    FROM bookings JOIN equipment ON equipment.id = bookings.equipment_id
    WHERE substr(bookings.created_at, 1, 10) >= date('now', '-29 days') AND bookings.status != 'cancelled'
    GROUP BY equipment.id, equipment.name ORDER BY value DESC, equipment.name LIMIT 8`)
		.all<RankingRow>();
	const pages = await database
		.prepare(`SELECT path AS name, SUM(views) AS value FROM analytics
    WHERE day >= date('now', '-29 days') GROUP BY path ORDER BY value DESC, path LIMIT 8`)
		.all<RankingRow>();
	const applications = await database
		.prepare(`SELECT
    COALESCE(SUM(CASE WHEN substr(current.created_at, 1, 10) >= date('now', '-29 days') THEN 1 ELSE 0 END), 0) AS created_30d,
    COALESCE(SUM(CASE WHEN substr(current.created_at, 1, 10) >= date('now', '-29 days') AND EXISTS (
      SELECT 1 FROM applications previous WHERE previous.participant_key = current.participant_key AND previous.created_at < current.created_at
    ) THEN 1 ELSE 0 END), 0) AS returning_30d,
    COUNT(DISTINCT current.participant_key) AS participants_total,
    COUNT(DISTINCT CASE WHEN current.newsletter_consent = 1 THEN current.normalized_email END) AS newsletter_total
    FROM applications current`)
		.first<ApplicationTotals>();
	const offers = await database
		.prepare(`SELECT offer AS name, COUNT(*) AS value FROM applications
    WHERE substr(created_at, 1, 10) >= date('now', '-29 days')
    GROUP BY offer ORDER BY value DESC, offer LIMIT 8`)
		.all<RankingRow>();

	return Response.json(
		{
			traffic: traffic || { views_30d: 0, views_today: 0 },
			bookings: bookings || { created_30d: 0, upcoming: 0, completed_30d: 0, cancelled_30d: 0 },
			equipment: equipment.results,
			pages: pages.results,
			applications: applications || { created_30d: 0, returning_30d: 0, participants_total: 0, newsletter_total: 0 },
			offers: offers.results,
			generatedAt: Date.now(),
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
}
