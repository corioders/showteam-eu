// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata } from "next";
import { Suspense } from "react";

import { Editable } from "@/components/editor/editable";
import { EditableImage, PageContentEditor } from "@/components/editor/page-content-editor";
import { ReservationFlow } from "@/components/reservation-flow";
import { getBookableEquipment } from "@/lib/equipment";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
	title: "Rezerwuj aktywność",
	description: "Zarezerwuj aktywność w WAKE & SURF Village nad Jeziorem Łąckim.",
	alternates: { canonical: "/rezerwacje" },
};

export default function ReservationsPage() {
	return (
		<Suspense fallback={null}>
			<ReservationsContent />
		</Suspense>
	);
}

async function ReservationsContent() {
	const [equipment, pageContent] = await Promise.all([getBookableEquipment(), getPageContent("reservations")]);
	const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
	return (
		<PageContentEditor page="reservations" initial={pageContent.values} initialMedia={pageContent.media}>
			<section className="relative overflow-hidden border-white/10 border-b pt-32 pb-16 sm:pt-40 sm:pb-24">
				<EditableImage field="heroImageUrl" alt="Aktywności SHOWteam" sizes="100vw" className="object-cover" />
				<div className="absolute inset-0 bg-black/75" />
				<div className="site-container relative">
					<Editable field="eyebrow" render={<p className="eyebrow" />} />
					<Editable
						field="title"
						multiline={true}
						render={
							<h1
								aria-label={pageContent.values.title}
								className="mt-5 max-w-5xl whitespace-pre-line font-black font-display text-[clamp(4rem,11vw,9rem)] uppercase leading-[.82] tracking-[-.04em]"
							/>
						}
					/>
					<Editable field="description" render={<p className="mt-7 max-w-2xl text-base text-white/60 leading-7 sm:text-lg" />} />
				</div>
			</section>
			<section className="py-12 sm:py-20">
				<div className="site-container">
					<ReservationFlow equipment={equipment} today={today} />
				</div>
			</section>
		</PageContentEditor>
	);
}
