import type { CollectionConfig } from "payload";

import { galleryAssets } from "@/lib/gallery-assets";
import { revalidateGallery } from "@/lib/revalidate-public";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Gallery: CollectionConfig = {
	slug: "gallery",
	labels: { singular: "Zdjęcie galerii", plural: "Galeria" },
	admin: {
		components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
		hideAPIURL: true,
		useAsTitle: "caption",
		group: "Strona internetowa",
		defaultColumns: ["caption", "season", "published"],
		description: "Dodaj zdjęcie lub film, ustaw układ i opublikuj w galerii. Najprościej zrobisz to przez Szybkie dodawanie na pulpicie.",
		preview: () => "/galeria",
	},
	access: {
		read: ({ req }) => (req.user ? true : { published: { equals: true } }),
		create: () => false,
		update: isLoggedIn,
		delete: isLoggedIn,
	},
	hooks: {
		afterChange: [
			({ doc, req }) => {
				if (req.user) {
					revalidateGallery();
				}
				return doc;
			},
		],
		afterDelete: [
			({ doc, req }) => {
				if (req.user) {
					revalidateGallery();
				}
				return doc;
			},
		],
	},
	defaultSort: "-createdAt",
	fields: [
		{ name: "image", label: "Zdjęcie lub film", type: "upload", relationTo: "media", access: { create: () => false, update: () => false }, admin: { hidden: true } },
		{
			name: "staticImage",
			label: "Zdjęcie startowe SHOWteam",
			type: "select",
			defaultValue: galleryAssets[0].value,
			options: galleryAssets.map((asset) => ({ label: asset.label, value: asset.value })),
			admin: { hidden: true },
		},
		{ name: "caption", label: "Krótki podpis", type: "text", required: true, admin: { placeholder: "np. SHOWCamp 2026" } },
		{
			type: "row",
			fields: [
				{ name: "season", label: "Kategoria", type: "select", required: true, defaultValue: "Lato", options: ["Lato", "Zima", "Szkolenia"] },
				{ name: "published", label: "Pokaż w galerii", type: "checkbox", defaultValue: true },
			],
		},
		{
			type: "collapsible",
			label: "Opcjonalne ustawienia wyglądu",
			admin: { initCollapsed: true, description: "Otwórz tylko wtedy, gdy zdjęcie źle się kadruje." },
			fields: [
				{ name: "alt", label: "Dokładny opis zdjęcia", type: "text", admin: { description: "Opcjonalne. Pomaga osobom korzystającym z czytnika ekranu." } },
				{
					type: "row",
					fields: [
						{
							name: "layout",
							label: "Rozmiar na komputerze",
							type: "select",
							required: true,
							defaultValue: "square",
							options: [
								{ label: "Duży", value: "large" },
								{ label: "Szeroki", value: "wide" },
								{ label: "Wysoki", value: "tall" },
								{ label: "Kwadrat", value: "square" },
							],
						},
						{
							name: "mobileLayout",
							label: "Kształt na telefonie",
							type: "select",
							required: true,
							defaultValue: "square",
							options: [
								{ label: "Poziomy", value: "landscape" },
								{ label: "Pionowy", value: "portrait" },
								{ label: "Kwadrat", value: "square" },
							],
						},
					],
				},
				{
					type: "row",
					fields: [
						{
							name: "fit",
							label: "Dopasowanie zdjęcia",
							type: "select",
							required: true,
							defaultValue: "cover",
							options: [
								{ label: "Wypełnij kafel", value: "cover" },
								{ label: "Pokaż całe zdjęcie", value: "contain" },
							],
						},
						{
							name: "mobilePosition",
							label: "Najważniejsza część kadru",
							type: "select",
							required: true,
							defaultValue: "same",
							options: [
								{ label: "Automatycznie", value: "same" },
								{ label: "Góra", value: "50% 20%" },
								{ label: "Środek", value: "50% 50%" },
								{ label: "Dół", value: "50% 80%" },
								{ label: "Lewa strona", value: "20% 50%" },
								{ label: "Prawa strona", value: "80% 50%" },
							],
						},
					],
				},
				{ name: "sourceUrl", label: "Link do posta", type: "text", admin: { description: "Opcjonalny link do Instagrama lub Facebooka." } },
				{ name: "sortOrder", label: "Ręczna kolejność", type: "number", required: true, defaultValue: 100, admin: { description: "Zwykle nie trzeba zmieniać." } },
			],
		},
	],
};
