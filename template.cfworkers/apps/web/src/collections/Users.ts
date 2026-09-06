// biome-ignore-all lint/style/useFilenamingConvention: Payload collection filenames are stable import contracts.
import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
	slug: "users",
	admin: {
		defaultColumns: ["username"],
		useAsTitle: "username",
	},
	auth: {
		cookies: {
			sameSite: "Strict",
			// biome-ignore lint/suspicious/noUndeclaredEnvVars: Playwright serves production builds over local HTTP.
			secure: process.env.NODE_ENV === "production" && process.env["PAYLOAD_COOKIE_SECURE"] !== "false",
		},
		loginWithUsername: { allowEmailLogin: false, requireEmail: false },
		removeTokenFromResponses: true,
	},
	fields: [],
	versions: false,
};
