// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata } from "next";
import { Suspense } from "react";

import { Editable } from "@/components/editor/editable";
import { EditableImage, PageContentEditor } from "@/components/editor/page-content-editor";
import { StayBookingForm } from "@/components/stay-booking-form";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
	title: "Rezerwuj nocleg nad wodą",
	description: "Zarezerwuj kontener mieszkalny lub domek holenderski przy WAKE & SURF Village.",
	alternates: { canonical: "/noclegi" },
};
export default function StaysPage() {
	return (
		<Suspense fallback={null}>
			<StaysContent />
		</Suspense>
	);
}

async function StaysContent() {
	const pageContent = await getPageContent("stays");
	const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
	return (
		<PageContentEditor page="stays" initial={pageContent.values} initialMedia={pageContent.media}>
			<section className="relative overflow-hidden border-white/10 border-b pt-32 pb-16 sm:pt-40 sm:pb-24">
				<EditableImage field="heroImageUrl" alt="Noclegi w WAKE & SURF Village" sizes="100vw" className="object-cover" />
				<div className="absolute inset-0 bg-black/75" />
				<div className="site-container relative">
					<Editable field="eyebrow" render={<p className="eyebrow" />} />
					<Editable
						field="title"
						multiline={true}
						render={
							<h1
								aria-label={pageContent.values.title}
								className="mt-5 max-w-5xl whitespace-pre-line font-black font-display text-[clamp(4rem,11vw,9rem)] uppercase leading-[.82]"
							/>
						}
					/>
					<Editable field="description" render={<p className="mt-7 max-w-2xl text-lg text-white/65 leading-8" />} />
				</div>
			</section>
			<section className="py-12 sm:py-20">
				<div className="site-container mx-auto max-w-4xl">
					<StayBookingForm today={today} />
				</div>
			</section>
		</PageContentEditor>
	);
}
