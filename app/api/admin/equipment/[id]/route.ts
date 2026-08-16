import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { equipmentMutationData } from "@/lib/admin-equipment";
import { parseEditableEquipment } from "@/lib/editor-equipment";
import { todayInPoland } from "@/lib/reservations";
import { revalidateEquipment } from "@/lib/revalidate-public";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const parsed = parseEditableEquipment(await request.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ message: "Sprawdź zaznaczone informacje.", errors: parsed.errors }, { status: 400 });
  try {
    const { id } = await params;
    await payload.update({ collection: "equipment", id, data: equipmentMutationData(parsed.data), overrideAccess: false, user });
    revalidateEquipment();
    return NextResponse.json({ message: "Zmiany sprzętu zostały opublikowane." });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Visual equipment update failed" });
    const message = error instanceof Error && error.message.includes("przyszłe potwierdzone rezerwacje") ? error.message : "Nie udało się zapisać sprzętu. Twoje dane nadal są w formularzu.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  try {
    const { id } = await params;
    const futureBookings = await payload.count({ collection: "bookings", where: { and: [{ equipment: { equals: id } }, { bookingDate: { greater_than_equal: todayInPoland() } }, { status: { equals: "confirmed" } }] }, overrideAccess: true });
    if (futureBookings.totalDocs) return NextResponse.json({ message: "Najpierw anuluj przyszłe rezerwacje tego sprzętu. Potem będzie można go usunąć." }, { status: 409 });
    await payload.delete({ collection: "equipment", id, overrideAccess: false, user });
    revalidateEquipment();
    return NextResponse.json({ message: "Sprzęt został usunięty." });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Inline equipment deletion failed" });
    return NextResponse.json({ message: "Nie udało się usunąć sprzętu." }, { status: 500 });
  }
}
