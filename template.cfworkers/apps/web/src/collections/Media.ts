// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
	slug: "media",
	access: {
		create: ({ req }) => Boolean(req.user),
		delete: ({ req }) => Boolean(req.user),
		read: ({ req }) => Boolean(req.user),
		update: ({ req }) => Boolean(req.user),
	},
	fields: [{ name: "alt", type: "text", required: true }],
	upload: true,
};
