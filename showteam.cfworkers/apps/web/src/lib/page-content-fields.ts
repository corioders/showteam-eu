import type { PageContentName } from "@/lib/page-content-schema";

export const pageContentLinkFields: Partial<Record<PageContentName, Readonly<Record<string, string>>>> = {
	home: {
		locationPorebaUrl: "Mapa: Poręba",
		locationDolomityUrl: "Mapa: Dolomity",
		locationAndorraUrl: "Mapa: Andorra",
	},
	contact: {
		mapUrl: "Link do mapy",
		instagramUrl: "Link do Instagrama",
		tiktokUrl: "Link do TikToka",
		facebookUrl: "Link do Facebooka",
	},
};
