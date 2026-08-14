import { getPayload } from "payload";
import config, { database } from "@payload-config";

type ApplicationRow = {
  id: number; reference: string; created_at: string; status: string; offer: string;
  participant_name: string; email: string; phone: string; prior_count: number; history_json: string;
};
type CountRow = { total: number };
type NewsletterRow = { email: string; contact_name: string; consented_at: string | null; applications: number };

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  if (!(await payload.auth({ headers: request.headers })).user) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const [applications, total, newsletter] = await Promise.all([
    database.prepare(`SELECT current.id, current.reference, current.created_at, current.status, current.offer,
      current.participant_name, current.email, current.phone,
      (SELECT COUNT(*) FROM applications previous WHERE previous.participant_key = current.participant_key AND previous.created_at < current.created_at) AS prior_count,
      COALESCE((SELECT json_group_array(json_object(
        'id', history.id, 'reference', history.reference, 'createdAt', history.created_at,
        'status', history.status, 'offer', history.offer
      )) FROM (
        SELECT id, reference, created_at, status, offer FROM applications
        WHERE participant_key = current.participant_key AND id != current.id
        ORDER BY created_at DESC LIMIT 20
      ) history), '[]') AS history_json
      FROM applications current ORDER BY current.created_at DESC LIMIT 200`).all<ApplicationRow>(),
    database.prepare("SELECT COUNT(*) AS total FROM applications").first<CountRow>(),
    database.prepare(`SELECT consent.normalized_email AS email,
      (SELECT participant_name FROM applications latest WHERE latest.normalized_email = consent.normalized_email ORDER BY latest.created_at DESC LIMIT 1) AS contact_name,
      MAX(consent.newsletter_consented_at) AS consented_at, COUNT(*) AS applications
      FROM applications consent WHERE consent.newsletter_consent = 1 AND consent.normalized_email != ''
      GROUP BY consent.normalized_email ORDER BY consented_at DESC, email`).all<NewsletterRow>(),
  ]);
  return Response.json({
    applications: applications.results.map((entry) => ({
      id: entry.id, reference: entry.reference, createdAt: entry.created_at, status: entry.status,
      offer: entry.offer, participantName: entry.participant_name, email: entry.email, phone: entry.phone,
      priorCount: entry.prior_count, history: JSON.parse(entry.history_json) as unknown[],
    })),
    total: total?.total || 0,
    newsletter: newsletter.results,
  }, { headers: { "Cache-Control": "no-store" } });
}
