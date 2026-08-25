// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata } from "next";

import { ApplicationForm } from "@/components/application-form";
import { EditableText, PageContentEditor } from "@/components/editor/page-content-editor";
import { getApplicationOfferGroups } from "@/lib/application-options";
import { getOffers } from "@/lib/cms";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
	title: "Formularz zgłoszeniowy",
	description: "Zgłoszenie uczestnika na wyjazd, SHOWCamp lub szkolenie SHOWteam.",
	alternates: { canonical: "/zgloszenie" },
};
export const revalidate = false;

export default async function ApplicationPage({ searchParams }: { searchParams: Promise<{ oferta?: string }> }) {
	const [offers, query, pageContent] = await Promise.all([getOffers(), searchParams, getPageContent("application")]);
	const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
	const groups = getApplicationOfferGroups(offers, today);

	return (
		<PageContentEditor page="application" initial={pageContent.values} initialMedia={pageContent.media}>
			<section className="pt-32 pb-24 md:pt-40 md:pb-32">
				<div className="site-container grid gap-12 xl:grid-cols-[.65fr_1.35fr]">
					<header className="xl:sticky xl:top-32 xl:self-start">
						<span className="eyebrow">
							<EditableText field="eyebrow" />
						</span>
						<h1 className="mt-4 font-black font-display text-6xl uppercase leading-[.86] tracking-[-.04em] sm:text-8xl">
							<EditableText field="titleTop" />
							<br />
							<span className="text-orange-500">
								<EditableText field="titleAccent" />
							</span>
						</h1>
						<p className="mt-7 max-w-lg text-white/55 leading-7">
							<EditableText field="description" multiline={true} />
						</p>
					</header>
					<ApplicationForm groups={groups} initialOffer={query.oferta} />
				</div>
			</section>
		</PageContentEditor>
	);
}
