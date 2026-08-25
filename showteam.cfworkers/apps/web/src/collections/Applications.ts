import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Applications: CollectionConfig = {
	slug: "applications",
	labels: { singular: "Zgłoszenie", plural: "Zgłoszenia uczestników" },
	admin: {
		hideAPIURL: true,
		useAsTitle: "reference",
		group: "Zgłoszenia",
		defaultColumns: ["createdAt", "participantName", "offer", "status"],
		description: "Zgłoszenia wysłane przez formularz na stronie. E-maile potwierdzające zostaną podłączone później.",
	},
	access: { read: isLoggedIn, create: () => false, update: isLoggedIn, delete: isLoggedIn },
	defaultSort: "-createdAt",
	fields: [
		{
			name: "status",
			label: "Status",
			type: "select",
			required: true,
			defaultValue: "new",
			options: [
				{ label: "Nowe — wymaga kontaktu", value: "new" },
				{ label: "Skontaktowano się", value: "contacted" },
				{ label: "Potwierdzone", value: "confirmed" },
				{ label: "Odrzucone", value: "rejected" },
				{ label: "Anulowane", value: "cancelled" },
			],
		},
		{ name: "staffNotes", label: "Notatka dla obsługi", type: "textarea", maxLength: 1000 },
		{
			type: "collapsible",
			label: "Dane przesłane przez uczestnika",
			admin: { initCollapsed: false },
			fields: [
				{ name: "reference", label: "Numer zgłoszenia", type: "text", required: true, unique: true, admin: { readOnly: true } },
				{ name: "offer", label: "Wybrany termin lub oferta", type: "text", required: true, admin: { readOnly: true } },
				{ name: "participantName", label: "Imię i nazwisko uczestnika", type: "text", required: true, admin: { readOnly: true } },
				{ name: "participantKey", label: "Klucz uczestnika", type: "text", required: true, index: true, admin: { hidden: true, readOnly: true } },
				{
					name: "birthDate",
					label: "Data urodzenia",
					type: "date",
					required: true,
					admin: { readOnly: true, date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } },
				},
				{ name: "address", label: "Adres zamieszkania i kod pocztowy", type: "textarea", required: true, admin: { readOnly: true } },
				{
					type: "row",
					fields: [
						{ name: "email", label: "E-mail kontaktowy", type: "email", required: true, admin: { readOnly: true } },
						{ name: "normalizedEmail", label: "E-mail do wyszukiwania", type: "text", required: true, index: true, admin: { hidden: true, readOnly: true } },
						{ name: "participantEmail", label: "E-mail uczestnika", type: "email", admin: { readOnly: true } },
					],
				},
				{ name: "phone", label: "Telefon opiekuna lub uczestnika", type: "text", required: true, admin: { readOnly: true } },
				{
					type: "row",
					fields: [
						{ name: "discipline", label: "Dyscyplina", type: "select", options: ["Narty", "Snowboard", "Sporty wodne", "Inne"], admin: { readOnly: true } },
						{ name: "level", label: "Poziom", type: "select", options: ["Od podstaw", "Doskonalenie", "Jazda sportowa"], admin: { readOnly: true } },
						{ name: "transport", label: "Transport", type: "select", options: ["Tak", "Nie", "Nie dotyczy"], admin: { readOnly: true } },
					],
				},
				{ name: "notes", label: "Uwagi", type: "textarea", maxLength: 2000, admin: { readOnly: true } },
				{ name: "invoiceRequested", label: "Klient chce fakturę", type: "checkbox", defaultValue: false, admin: { readOnly: true } },
				{ name: "invoiceCompany", label: "Nazwa firmy", type: "text", admin: { readOnly: true, condition: (_, siblingData) => Boolean(siblingData.invoiceRequested) } },
				{ name: "invoiceNip", label: "NIP", type: "text", admin: { readOnly: true, condition: (_, siblingData) => Boolean(siblingData.invoiceRequested) } },
				{ name: "invoiceStreet", label: "Ulica i numer", type: "text", admin: { readOnly: true, condition: (_, siblingData) => Boolean(siblingData.invoiceRequested) } },
				{
					name: "invoicePostalCode",
					label: "Kod pocztowy",
					type: "text",
					admin: { readOnly: true, condition: (_, siblingData) => Boolean(siblingData.invoiceRequested) },
				},
				{ name: "invoiceCity", label: "Miejscowość", type: "text", admin: { readOnly: true, condition: (_, siblingData) => Boolean(siblingData.invoiceRequested) } },
				{ name: "privacyConsent", label: "Zgoda na przetwarzanie danych", type: "checkbox", required: true, admin: { readOnly: true } },
				{ name: "accuracyConfirmed", label: "Potwierdzenie poprawności danych i pełnoletności/opiekuna", type: "checkbox", required: true, admin: { readOnly: true } },
				{ name: "newsletterConsent", label: "Dobrowolna zgoda na newsletter", type: "checkbox", defaultValue: false, admin: { readOnly: true } },
				{
					name: "newsletterConsentedAt",
					label: "Data zgody na newsletter",
					type: "date",
					admin: { readOnly: true, condition: (_, siblingData) => Boolean(siblingData.newsletterConsent) },
				},
			],
		},
	],
};
