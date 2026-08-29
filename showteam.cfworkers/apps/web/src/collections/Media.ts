// biome-ignore-all lint/plugin/no-throw: Payload collection hooks report rejected uploads through APIError.
// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import { APIError, type CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Media: CollectionConfig = {
	slug: "media",
	labels: { singular: "Plik", plural: "Pliki" },
	admin: {
		components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
		hideAPIURL: true,
		hidden: true,
		useAsTitle: "alt",
		group: "Treści",
		defaultColumns: ["filename", "alt", "updatedAt"],
		description: "Biblioteka zdjęć i filmów używanych na stronie.",
	},
	access: {
		read: () => true,
		create: isLoggedIn,
		update: isLoggedIn,
		delete: isLoggedIn,
	},
	hooks: {
		beforeValidate: [
			({ data, req }) => {
				if (req.file?.mimetype.startsWith("image/") && !data?.optimizedImage) {
					throw new APIError("Zdjęcia muszą zostać zoptymalizowane przez uploader cstd.", 400, null, true);
				}
				return data;
			},
		],
	},
	fields: [
		{ name: "alt", label: "Opis pliku", type: "text", required: true },
		{ name: "optimizedImage", type: "json", admin: { hidden: true } },
		{ name: "optimizedFiles", type: "json", admin: { hidden: true } },
		{ name: "contentHash", type: "text", admin: { hidden: true }, index: true },
	],
	upload: {
		crop: false,
		focalPoint: true,
		mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "video/mp4", "video/webm", "video/quicktime"],
	},
};
