// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { validSameOrigin } from "@/lib/admin-auth";
import { equipmentMutationData } from "@/lib/admin-equipment";
import { parseEditableEquipment } from "@/lib/editor-equipment";
import { deleteOptimizedMedia } from "@/lib/optimized-media";
import { todayInPoland } from "@/lib/reservations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}
	const parsed = parseEditableEquipment(await request.json().catch(() => null));
	if (!parsed.data) {
		return NextResponse.json({ message: "Sprawdź zaznaczone informacje.", errors: parsed.errors }, { status: 400 });
	}
	try {
		const { id } = await params;
		await payload.update({ collection: "equipment", id, data: equipmentMutationData(parsed.data), overrideAccess: false, user });
		return NextResponse.json({ message: "Zmiany aktywności zostały opublikowane." });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Visual equipment update failed" });
		const message =
			error instanceof Error && error.message.includes("przyszłe rezerwacje") ? error.message : "Nie udało się zapisać aktywności. Twoje dane nadal są w formularzu.";
		return NextResponse.json({ message }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!validSameOrigin(request)) {
		return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
	}
	try {
		const { id } = await params;
		const equipment = await payload.findByID({ collection: "equipment", id, depth: 0, overrideAccess: false, user });
		const futureBookings = await payload.count({
			collection: "bookings",
			where: { and: [{ equipment: { equals: id } }, { bookingDate: { greater_than_equal: todayInPoland() } }, { status: { in: ["pending", "confirmed"] } }] },
			overrideAccess: true,
		});
		if (futureBookings.totalDocs) {
			return NextResponse.json({ message: "Najpierw anuluj przyszłe rezerwacje tej aktywności. Potem będzie można ją usunąć." }, { status: 409 });
		}
		await payload.delete({ collection: "equipment", id, overrideAccess: false, user });
		if (typeof equipment.image === "number") {
			await deleteOptimizedMedia(payload, equipment.image);
		}
		return NextResponse.json({ message: "Aktywność została usunięta." });
	} catch (error) {
		payload.logger.error({ err: error, msg: "Inline equipment deletion failed" });
		return NextResponse.json({ message: "Nie udało się usunąć aktywności." }, { status: 500 });
	}
}
