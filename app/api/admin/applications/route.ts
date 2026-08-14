import { getPayload } from "payload";
import config from "@payload-config";

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  if (!(await payload.auth({ headers: request.headers })).user) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const result = await payload.find({ collection: "applications", sort: "-createdAt", limit: 200, overrideAccess: true });
  return Response.json({ applications: result.docs, total: result.totalDocs }, { headers: { "Cache-Control": "no-store" } });
}
