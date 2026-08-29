import config from "@payload-config";
import { connection } from "next/server";
import { getPayload } from "payload";

import { csvCell } from "@/lib/applications";

export async function GET(request: Request) {
	await connection();
	const payload = await getPayload({ config });
	if (!(await payload.auth({ headers: request.headers })).user) {
		return Response.json({ error: "Zaloguj się do panelu." }, { status: 401 });
	}
	const result = await payload.find({ collection: "applications", sort: "-createdAt", limit: 5000, overrideAccess: true });
	const header = [
		"Numer",
		"Data zgłoszenia",
		"Status",
		"Termin / oferta",
		"Uczestnik",
		"Data urodzenia",
		"Adres",
		"E-mail kontaktowy",
		"E-mail uczestnika",
		"Telefon",
		"Dyscyplina",
		"Poziom",
		"Transport",
		"Uwagi",
		"Faktura",
		"Firma",
		"NIP",
		"Ulica i numer",
		"Kod pocztowy",
		"Miejscowość",
		"Zgoda newsletter",
	];
	const rows = result.docs.map((entry) => [
		entry.reference,
		entry.createdAt,
		entry.status,
		entry.offer,
		entry.participantName,
		entry.birthDate,
		entry.address,
		entry.email,
		entry.participantEmail,
		entry.phone,
		entry.discipline,
		entry.level,
		entry.transport,
		entry.notes,
		entry.invoiceRequested ? "Tak" : "Nie",
		entry.invoiceCompany,
		entry.invoiceNip,
		entry.invoiceStreet,
		entry.invoicePostalCode,
		entry.invoiceCity,
		entry.newsletterConsent ? "Tak" : "Nie",
	]);
	const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
	const date = new Date().toISOString().slice(0, 10);
	return new Response(csv, {
		headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="zgloszenia-showteam-${date}.csv"`, "Cache-Control": "no-store" },
	});
}
