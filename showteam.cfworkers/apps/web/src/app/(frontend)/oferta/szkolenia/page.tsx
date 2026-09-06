// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { Activity, BadgeCheck, RadioTower, Sailboat, Waves } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CmsDetails } from "@/components/cms-details";
import { ContactCta } from "@/components/contact-cta";
import { OfferCtaTitle, OfferInlineEditor, OfferLocationLink, OfferText } from "@/components/editor/offer-inline-editor";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getOfferByCategory } from "@/lib/cms";

export const metadata: Metadata = {
	title: "Szkolenia",
	description: "Kurs sternika motorowodnego, żeglarza jachtowego, operatora radiowego i szkolenia z aktywności.",
	alternates: { canonical: "/oferta/szkolenia" },
};
const programs = [
	{
		icon: Waves,
		number: "01",
		titleField: "trainingMotorboatTitle",
		title: "Sternik motorowodny",
		bodyField: "trainingMotorboatBody",
		text: "Teoria i praktyka, przygotowanie do egzaminu państwowego oraz możliwość zdobycia międzynarodowych uprawnień.",
	},
	{
		icon: Sailboat,
		number: "02",
		titleField: "trainingSailingTitle",
		title: "Żeglarz jachtowy",
		bodyField: "trainingSailingBody",
		text: "Nauka od podstaw, manewry, bezpieczeństwo i praktyka na Jeziorze Łąckim dla uczestników od 14. roku życia.",
	},
	{
		icon: RadioTower,
		number: "03",
		titleField: "trainingRadioTitle",
		title: "Operator radiowy",
		bodyField: "trainingRadioBody",
		text: "Przygotowanie do bezpiecznej obsługi łączności radiowej i egzaminu na świadectwo operatora.",
	},
	{
		icon: Activity,
		number: "04",
		titleField: "trainingActivitiesTitle",
		title: "Szkolenia z aktywności",
		bodyField: "trainingActivitiesBody",
		text: "Instruktaż na skuterach, katamaranach, windsurfingu, padlu i pozostałym sprzęcie dostępnym w bazie.",
	},
];

export default function TrainingPage() {
	return (
		<Suspense fallback={null}>
			<TrainingContent />
		</Suspense>
	);
}

async function TrainingContent() {
	const offer = await getOfferByCategory("Szkolenia");
	if (!offer) {
		notFound();
	}
	return (
		<OfferInlineEditor key={offer.cmsId ?? offer.href} offer={offer}>
			<PageHero
				eyebrow={`${offer.category} · ${offer.season}`}
				title={offer.title}
				description={offer.summary}
				location={offer.location}
				image={offer.image}
				imageAlt={offer.imageAlt}
				offer={offer}
				applicationHref={`/zgloszenie?oferta=${encodeURIComponent(offer.title)}`}
				applicationLabel="Zgłoś się na szkolenie"
			/>
			<OfferLocationLink label="WAKE & SURF Village · Nad Zaporą 21, Poręba" />
			<section className="py-20 md:py-28">
				<div className="site-container">
					<div className="mb-12 max-w-4xl">
						<span className="eyebrow">
							<OfferText field="trainingProgramsEyebrow" fallback="Uprawnienia i umiejętności" />
						</span>
						<h2 className="mt-4 font-black font-display text-6xl uppercase leading-[0.87] tracking-tight sm:text-8xl">
							<OfferText field="trainingProgramsTitle" fallback="Papier to start." />
							<br />
							<span className="text-orange-500">
								<OfferText field="trainingProgramsAccent" fallback="Liczy się praktyka." />
							</span>
						</h2>
					</div>
					<div className="grid gap-px bg-white/10 md:grid-cols-2">
						{programs.map(({ icon: Icon, number, titleField, title, bodyField, text }) => (
							<div key={title} className="bg-[#080a0b] p-7 sm:p-9">
								<div className="flex items-center justify-between">
									<Icon className="size-8 text-sky-300" />
									<span className="font-black font-display text-4xl text-white/10">{number}</span>
								</div>
								<h3 className="mt-16 font-black font-display text-3xl uppercase sm:text-4xl">
									<OfferText field={titleField} fallback={title} />
								</h3>
								<p className="mt-4 max-w-lg text-white/55 leading-7">
									<OfferText field={bodyField} fallback={text} multiline={true} />
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
			<section className="border-white/10 border-y bg-white/[0.03] py-20 md:py-28">
				<div className="site-container grid gap-12 lg:grid-cols-2">
					<div>
						<span className="eyebrow">
							<OfferText field="trainingFaqEyebrow" fallback="Najczęściej pytacie" />
						</span>
						<h2 className="mt-4 font-black font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
							<OfferText field="trainingFaqTitle" fallback="Jak wygląda" />
							<br />
							<OfferText field="trainingFaqAccent" fallback="szkolenie?" />
						</h2>
						<div className="mt-8 flex items-center gap-3 font-semibold text-sm text-white/60">
							<BadgeCheck className="size-5 text-orange-400" /> <OfferText field="trainingDatesNote" fallback="Terminy ustalamy bezpośrednio" />
						</div>
					</div>
					<Accordion>
						<AccordionItem value="age">
							<AccordionTrigger>
								<OfferText field="trainingAgeTitle" fallback="Od jakiego wieku?" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="trainingAgeBody"
									fallback="Kurs sternika motorowodnego i kurs żeglarza jachtowego są dostępne od 14. roku życia, z wymaganymi zgodami dla osób niepełnoletnich."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="format">
							<AccordionTrigger>
								<OfferText field="trainingFormatTitle" fallback="Jak łączymy teorię i praktykę?" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="trainingFormatBody"
									fallback="Materiał teoretyczny przygotowuje do egzaminu, a część praktyczna odbywa się na wodzie, na sprzęcie używanym w realnych warunkach."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="dates">
							<AccordionTrigger>
								<OfferText field="trainingWhenTitle" fallback="Kiedy są terminy?" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="trainingWhenBody"
									fallback="Daty kursów i egzaminów są ustalane w sezonie. Zadzwoń lub napisz, aby poznać najbliższy dostępny termin."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="physio">
							<AccordionTrigger>
								<OfferText field="trainingPhysioFaqTitle" fallback="Dla kogo jest FizjoSPORT?" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="trainingPhysioFaqBody"
									fallback="Dla dzieci, młodzieży i dorosłych, którzy chcą poprawić jakość ruchu, przygotować się do sportu lub pracować nad postawą pod opieką specjalisty."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</section>
			<section className="border-white/10 border-y bg-sky-300 py-16 text-black">
				<div className="site-container flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<span className="font-black text-xs uppercase tracking-[.2em]">
							<OfferText field="trainingReservationEyebrow" fallback="Nie umiesz? Nauczymy Cię." />
						</span>
						<h2 className="mt-3 max-w-3xl font-black font-display text-5xl uppercase leading-[.9] sm:text-7xl">
							<OfferText field="trainingReservationTitle" fallback="Instruktor może być częścią rezerwacji." multiline={true} />
						</h2>
					</div>
					<Button asChild={true} size="lg" className="shrink-0 bg-black text-white hover:bg-black/80">
						<Link href="/rezerwacje">
							<OfferText field="trainingReservationButton" fallback="Rezerwuj aktywność" />
						</Link>
					</Button>
				</div>
			</section>
			<PhotoMosaic
				offer={offer}
				label="Nauka przez ruch"
				labelField="trainingMosaicLabel"
				imageFields={["trainingMosaicOneImageUrl", "trainingMosaicTwoImageUrl", "trainingMosaicThreeImageUrl"]}
				photos={[
					{ src: "/media/summer-sailing-drone.jpg", alt: "Szkolenie żeglarskie na Jeziorze Łąckim", position: "object-[35%_center]" },
					{ src: "/media/summer-wake-aerial.jpg", alt: "Szkolenie wakeboardowe z lotu ptaka", position: "object-[60%_center]" },
					{ src: "/media/summer-sunset-wake.jpg", alt: "Łódź treningowa SHOWteam o zachodzie słońca" },
				]}
			/>
			<CmsDetails offer={offer} />
			<ContactCta title={<OfferCtaTitle />} applicationOffer={offer.title} />
		</OfferInlineEditor>
	);
}
