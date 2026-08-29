// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import type { GlobalConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const EventSettings: GlobalConfig = {
	slug: "event-settings",
	label: "Propozycje imprez",
	admin: { group: "Treści strony", description: "Propozycje widoczne w formularzu Zorganizuj imprezę." },
	access: { read: () => true, update: isLoggedIn },
	fields: [
		{
			name: "cateringOptions",
			label: "Propozycje cateringu",
			type: "array",
			minRows: 1,
			required: true,
			defaultValue: [
				{ label: "Przekąski powitalne" },
				{ label: "Grill" },
				{ label: "Kuchnia włoska" },
				{ label: "Kuchnia hiszpańska" },
				{ label: "Kuchnia japońska" },
				{ label: "Kuchnia hinduska" },
			],
			fields: [{ name: "label", label: "Nazwa", type: "text", required: true, maxLength: 80 }],
		},
		{
			name: "attractionOptions",
			label: "Atrakcje dodatkowe",
			type: "array",
			minRows: 1,
			required: true,
			defaultValue: [
				{ label: "Kulig kajakowy" },
				{ label: "DJ" },
				{ label: "Koncert" },
				{ label: "Pokaz laserów" },
				{ label: "Animacje dla dzieci" },
				{ label: "Barista" },
			],
			fields: [{ name: "label", label: "Nazwa", type: "text", required: true, maxLength: 80 }],
		},
	],
};
