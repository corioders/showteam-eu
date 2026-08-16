import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { stayBookingStatuses, type StayBookingStatus } from "@/lib/stay-bookings";

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  if (!(await payload.auth({ headers: request.headers })).user) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const result = await payload.find({ collection: "stay-bookings", overrideAccess: true, limit: 300, sort: "-checkIn" });
  return Response.json({ bookings: result.docs }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return Response.json({ error: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  if (!(await payload.auth({ headers: request.headers })).user) return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
  const input = await request.json().catch(() => null) as { id?: unknown; status?: unknown; staffNotes?: unknown } | null;
  const id = Number(input?.id);
  const status = String(input?.status || "") as StayBookingStatus;
  const staffNotes = String(input?.staffNotes || "").trim().slice(0, 2000);
  if (!Number.isInteger(id) || !stayBookingStatuses.includes(status)) return Response.json({ error: "Wybierz poprawny status." }, { status: 400 });
  const booking = await payload.update({ collection: "stay-bookings", id, overrideAccess: true, data: { status, staffNotes } });
  return Response.json({ booking });
}
