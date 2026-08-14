import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { csvCell } from "@/lib/applications";

type NewsletterRow = { email: string; contact_name: string; consented_at: string | null; applications: number };

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  if (!(await payload.auth({ headers: request.headers })).user) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const result = await database.prepare(`SELECT consent.normalized_email AS email,
    (SELECT participant_name FROM applications latest WHERE latest.normalized_email = consent.normalized_email ORDER BY latest.created_at DESC LIMIT 1) AS contact_name,
    MAX(consent.newsletter_consented_at) AS consented_at, COUNT(*) AS applications
    FROM applications consent WHERE consent.newsletter_consent = 1 AND consent.normalized_email != ''
    GROUP BY consent.normalized_email ORDER BY consented_at DESC, email`).all<NewsletterRow>();
  const header = ["E-mail", "Ostatni uczestnik", "Data zgody", "Liczba zgłoszeń"];
  const rows = result.results.map((entry) => [entry.email, entry.contact_name, entry.consented_at, entry.applications]);
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="newsletter-showteam-${date}.csv"`, "Cache-Control": "no-store" } });
}
