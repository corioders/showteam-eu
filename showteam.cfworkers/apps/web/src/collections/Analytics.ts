// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Analytics: CollectionConfig = {
	slug: "analytics",
	labels: { singular: "Statystyka odwiedzin", plural: "Statystyki odwiedzin" },
	admin: {
		hidden: true,
		hideAPIURL: true,
		useAsTitle: "path",
		group: "Pomoc i ustawienia",
		defaultColumns: ["day", "path", "views"],
		description: "Liczba wizyt w ostatnich 30 dniach. Bez cookies, adresów IP i danych osobowych. Starsze sumy są automatycznie usuwane.",
	},
	access: { read: isLoggedIn, create: () => false, update: () => false, delete: () => false },
	indexes: [{ fields: ["day", "path"], unique: true }],
	timestamps: false,
	defaultSort: "-day",
	fields: [
		{ name: "day", label: "Dzień", type: "date", required: true, admin: { date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } } },
		{ name: "path", label: "Strona", type: "text", required: true },
		{ name: "views", label: "Wizyty", type: "number", required: true, min: 0 },
	],
};
