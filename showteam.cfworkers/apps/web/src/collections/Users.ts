// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
	slug: "users",
	labels: { singular: "Konto obsługi", plural: "Konta obsługi" },
	admin: {
		useAsTitle: "email",
		hideAPIURL: true,
		group: "Pomoc i ustawienia",
		defaultColumns: ["name", "email"],
		description: "Osoby, które mogą logować się do panelu SHOWteam.",
	},
	auth: {
		cookies: { sameSite: "Strict", secure: process.env.NODE_ENV === "production" },
		removeTokenFromResponses: true,
	},
	fields: [
		{ name: "name", label: "Imię", type: "text" },
		{
			name: "receivesNotifications",
			label: "Otrzymuje powiadomienia",
			type: "checkbox",
			defaultValue: true,
			admin: { description: "Ta osoba dostaje powiadomienia o nowych rezerwacjach i zgłoszeniach na urządzeniach, na których je włączyła." },
		},
	],
	versions: false,
};
