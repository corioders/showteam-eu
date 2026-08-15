import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { equipmentMutationData } from "@/lib/admin-equipment";
import { parseEditableEquipment } from "@/lib/editor-equipment";

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
    return NextResponse.json({ message: "Zmiany sprzętu zostały opublikowane." });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Visual equipment update failed" });
    const message = error instanceof Error && error.message.includes("przyszłe potwierdzone rezerwacje") ? error.message : "Nie udało się zapisać sprzętu. Twoje dane nadal są w formularzu.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
