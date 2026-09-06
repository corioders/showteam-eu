// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata } from "next";
import { Suspense } from "react";

import { ApplicationForm } from "@/components/application-form";
import { Editable } from "@/components/editor/editable";
import { PageContentEditor } from "@/components/editor/page-content-editor";
import { getApplicationOfferGroups } from "@/lib/application-options";
import { getOffers } from "@/lib/cms";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
	title: "Formularz zgłoszeniowy",
	description: "Zgłoszenie uczestnika na wyjazd, SHOWCamp lub szkolenie SHOWteam.",
	alternates: { canonical: "/zgloszenie" },
};
export default function ApplicationPage({ searchParams }: { searchParams: Promise<{ oferta?: string }> }) {
	return (
		<Suspense fallback={null}>
			<ApplicationContent searchParams={searchParams} />
		</Suspense>
	);
}

async function ApplicationContent({ searchParams }: { searchParams: Promise<{ oferta?: string }> }) {
	const [offers, query, pageContent] = await Promise.all([getOffers(), searchParams, getPageContent("application")]);
	const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
	const groups = getApplicationOfferGroups(offers, today);

	return (
		<PageContentEditor page="application" initial={pageContent.values} initialMedia={pageContent.media}>
			<section className="pt-32 pb-24 md:pt-40 md:pb-32">
				<div className="site-container grid gap-12 xl:grid-cols-[.65fr_1.35fr]">
					<header className="xl:sticky xl:top-32 xl:self-start">
						<Editable field="eyebrow" render={<span className="eyebrow" />} />
						<h1 className="mt-4 font-black font-display text-6xl uppercase leading-[.86] tracking-[-.04em] sm:text-8xl">
							<Editable field="titleTop" />
							<br />
							<Editable field="titleAccent" render={<span className="text-orange-500" />} />
						</h1>
						<Editable field="description" render={<p className="mt-7 max-w-lg text-white/55 leading-7" />} />
					</header>
					<ApplicationForm groups={groups} initialOffer={query.oferta} />
				</div>
			</section>
		</PageContentEditor>
	);
}
