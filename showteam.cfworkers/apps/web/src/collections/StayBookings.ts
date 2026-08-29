// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const StayBookings: CollectionConfig = {
	slug: "stay-bookings",
	labels: { singular: "Rezerwacja noclegu", plural: "Noclegi" },
	admin: {
		hideAPIURL: true,
		useAsTitle: "reference",
		group: "Rezerwacje",
		defaultColumns: ["checkIn", "checkOut", "customerName", "status"],
		description: "Osobne rezerwacje pobytów nad wodą.",
	},
	access: { read: isLoggedIn, create: () => false, update: isLoggedIn, delete: isLoggedIn },
	defaultSort: "-checkIn",
	fields: [
		{
			name: "status",
			label: "Status",
			type: "select",
			required: true,
			defaultValue: "pending",
			options: [
				{ label: "Oczekuje na potwierdzenie", value: "pending" },
				{ label: "Potwierdzona", value: "confirmed" },
				{ label: "Zrealizowana", value: "completed" },
				{ label: "Anulowana", value: "cancelled" },
			],
		},
		{ name: "staffNotes", label: "Notatka dla obsługi", type: "textarea", maxLength: 2000 },
		{
			type: "collapsible",
			label: "Dane pobytu i gościa",
			admin: { initCollapsed: false },
			fields: [
				{ name: "reference", label: "Numer rezerwacji", type: "text", required: true, unique: true, admin: { readOnly: true } },
				{
					name: "accommodationTypes",
					label: "Rodzaj noclegu",
					type: "select",
					hasMany: true,
					required: true,
					options: ["Kontener mieszkalny", "Domek holenderski"],
					admin: { readOnly: true },
				},
				{
					type: "row",
					fields: [
						{
							name: "checkIn",
							label: "Przyjazd",
							type: "date",
							required: true,
							admin: { readOnly: true, date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } },
						},
						{
							name: "checkOut",
							label: "Wyjazd",
							type: "date",
							required: true,
							admin: { readOnly: true, date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } },
						},
						{ name: "guests", label: "Liczba gości", type: "number", required: true, min: 1, admin: { readOnly: true } },
					],
				},
				{ name: "customerName", label: "Imię i nazwisko", type: "text", required: true, admin: { readOnly: true } },
				{
					type: "row",
					fields: [
						{ name: "phone", label: "Telefon", type: "text", required: true, admin: { readOnly: true } },
						{ name: "email", label: "E-mail", type: "email", required: true, admin: { readOnly: true } },
					],
				},
				{ name: "customerNotes", label: "Uwagi gościa", type: "textarea", maxLength: 2000, admin: { readOnly: true } },
				{ name: "privacyConsent", label: "Zgoda na obsługę rezerwacji", type: "checkbox", required: true, admin: { readOnly: true } },
			],
		},
	],
};
