import { getPayload } from "payload";
import config, { database } from "@payload-config";
import { tvCookie, tvCookieName, verifyTvToken } from "@/lib/tv-auth";

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function GET(request: Request) {
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
  const response = Response.json(result.docs.map((booking) => {
    const equipment = typeof booking.equipment === "object" ? booking.equipment : null;
    return {
      id: String(booking.id),
      title: `${equipment?.name || "Sprzęt"} · ${booking.customerName}`,
      start: `${booking.bookingDate}T${booking.startTime}:00`,
      end: `${booking.bookingDate}T${booking.endTime}:00`,
      extendedProps: { reference: booking.reference, phone: booking.phone, status: booking.status, notes: booking.staffNotes || booking.customerNotes || "" },
    };
  }), { headers: { "Cache-Control": "no-store" } });
  if (tvAuthorized && tvToken) response.headers.append("Set-Cookie", tvCookie(tvToken));
  return response;
}
