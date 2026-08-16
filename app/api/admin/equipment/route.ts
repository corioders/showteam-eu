import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { equipmentMutationData, nextEquipmentSortOrder } from "@/lib/admin-equipment";
import { parseEditableEquipment } from "@/lib/editor-equipment";
import { revalidateEquipment } from "@/lib/revalidate-public";

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const parsed = parseEditableEquipment(await request.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ message: "Sprawdź zaznaczone informacje.", errors: parsed.errors }, { status: 400 });
  try {
    await payload.create({ collection: "equipment", data: { ...equipmentMutationData(parsed.data), slug: "sprzet", sortOrder: await nextEquipmentSortOrder(payload) }, overrideAccess: false, user });
    revalidateEquipment();
    return NextResponse.json({ message: "Sprzęt został dodany i opublikowany." }, { status: 201 });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Visual equipment create failed" });
    return NextResponse.json({ message: "Nie udało się dodać sprzętu. Twoje dane nadal są w formularzu." }, { status: 500 });
  }
}
