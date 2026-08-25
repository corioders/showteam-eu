import { revalidatePath, revalidateTag } from "next/cache";

import type { PageContentName } from "./page-content-schema";

const categoryPaths: Record<string, string> = { Lato: "/oferta/lato", Zima: "/oferta/zima", Szkolenia: "/oferta/szkolenia", Noclegi: "/oferta/noclegi-nad-woda" };

export function revalidateOffers(slug?: string, category?: string) {
	revalidateTag("offers", { expire: 0 });
	revalidatePath("/");
	if (slug) {
		revalidatePath(`/oferta/${slug}`);
	} else {
		revalidatePath("/oferta/[slug]", "page");
	}
	const categoryPath = category ? categoryPaths[category] : undefined;
	if (categoryPath && categoryPath !== `/oferta/${slug}`) {
		revalidatePath(categoryPath);
	}
}

export function revalidateGallery() {
	revalidateTag("gallery", { expire: 0 });
	revalidatePath("/");
	revalidatePath("/galeria");
}

const pageContentPaths: Record<PageContentName, string[]> = {
	home: ["/"],
	contact: ["/kontakt"],
	gallery: ["/", "/galeria"],
	reservations: ["/rezerwacje"],
	stays: ["/noclegi"],
	application: ["/zgloszenie"],
	eventInquiry: ["/zorganizuj-impreze"],
};

export function revalidatePageContent(page: PageContentName) {
	revalidateTag("page-content", { expire: 0 });
	for (const path of pageContentPaths[page]) {
		revalidatePath(path);
	}
}

export function revalidateEquipment() {
	revalidateTag("equipment", { expire: 0 });
	revalidatePath("/rezerwacje");
}
