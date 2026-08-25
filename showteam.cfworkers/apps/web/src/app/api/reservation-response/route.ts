// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
import config from "@payload-config";
import { getPayload } from "payload";

import { reminderTokenHash } from "@/lib/reminders";

export async function POST(request: Request) {
	const form = await request.formData();
	const token = String(form.get("token") || "");
	const response = String(form.get("response") || "");
	if (!/^[A-Za-z0-9_-]{22}$/.test(token) || (response !== "confirmed" && response !== "cancelled")) {
		return Response.json({ error: "Nieprawidłowy link." }, { status: 400 });
	}
	const payload = await getPayload({ config });
	const result = await payload.find({ collection: "bookings", overrideAccess: true, limit: 1, where: { reminderTokenHash: { equals: await reminderTokenHash(token) } } });
	const booking = result.docs[0];
	if (!booking) {
		return Response.json({ error: "Ten link jest nieprawidłowy lub wygasł." }, { status: 404 });
	}
	if (booking.reminderResponse) {
		return Response.redirect(new URL(`/r/${token}/${booking.reminderResponse === "confirmed" ? "tak" : "nie"}?done=1`, request.url), 303);
	}
	await payload.update({
		collection: "bookings",
		id: booking.id,
		overrideAccess: true,
		data: {
			reminderResponse: response,
			reminderRespondedAt: new Date().toISOString(),
			...(response === "cancelled" ? { status: "cancelled" as const } : {}),
		},
	});
	return Response.redirect(new URL(`/r/${token}/${response === "confirmed" ? "tak" : "nie"}?done=1`, request.url), 303);
}
