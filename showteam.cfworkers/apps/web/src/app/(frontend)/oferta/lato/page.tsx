// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { Bike, Sailboat, TentTree, Waves } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsDetails } from "@/components/cms-details";
import { ContactCta } from "@/components/contact-cta";
import { OfferCtaTitle, OfferDateList, OfferInlineEditor, OfferLocationLink, OfferText } from "@/components/editor/offer-inline-editor";
import { PageHero } from "@/components/page-hero";
import { PhotoMosaic } from "@/components/photo-mosaic";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getOfferByCategory } from "@/lib/cms";

export const metadata: Metadata = {
	title: "Lato 2026/2027",
	description: "WAKE & SURF Village, SHOWCamp i sporty wodne nad Jeziorem Łąckim.",
	alternates: { canonical: "/oferta/lato" },
};
const activities = [
	[Waves, "summerWaterTitle", "Na wodzie", "summerWaterBody", "Wakeboard, narty wodne, SUP, kajaki, windsurfing, wing foil i skutery wodne."],
	[Sailboat, "summerSailingTitle", "Pod żaglami", "summerSailingBody", "Katamarany Hobie Cat, łodzie żaglowe i kursy prowadzone przez instruktorów."],
	[Bike, "summerLandTitle", "Na lądzie", "summerLandBody", "Padel, rowery elektryczne, siatkówka plażowa, badminton, slackline i frisbee."],
	[TentTree, "summerAfterTitle", "Po wszystkim", "summerAfterBody", "Glamping, prywatne molo, piaszczysta plaża, hamaki, sauna i wieczorne kino."],
] as const;

export default async function SummerPage() {
	const offer = await getOfferByCategory("Lato");
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
			/>
			<OfferLocationLink label="WAKE & SURF Village · Nad Zaporą 21, Poręba" />

			<section className="py-20 md:py-28">
				<div className="site-container">
					<div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
						<div>
							<span className="eyebrow">
								<OfferText field="summerDatesEyebrow" fallback="Lato 2026/2027" />
							</span>
							<h2 className="mt-4 font-black font-display text-6xl uppercase leading-[0.88] tracking-tight sm:text-8xl">
								<OfferText field="summerDatesTitle" fallback="Nowe" />
								<br />
								<span className="text-sky-300">
									<OfferText field="summerDatesAccent" fallback="turnusy." />
								</span>
							</h2>
							<p className="mt-6 max-w-lg text-white/55 leading-7">
								<OfferText field="summerDatesBody" fallback="Terminy Gardy, Poręby i letnich wyjazdów opublikujemy wkrótce." multiline={true} />
							</p>
						</div>
						<OfferDateList offer={offer} variant="summer" />
					</div>
				</div>
			</section>

			<section className="border-white/10 border-y bg-white/[0.03] py-20 md:py-28">
				<div className="site-container">
					<span className="eyebrow">
						<OfferText field="summerActivitiesEyebrow" fallback="Z brzegu prosto do akcji" />
					</span>
					<h2 className="mt-4 max-w-4xl font-black font-display text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
						<OfferText field="summerActivitiesTitle" fallback="Wybierz sprzęt." />
						<br />
						<OfferText field="summerActivitiesAccent" fallback="Resztę pokażemy." />
					</h2>
					<div className="mt-12 grid gap-4 md:grid-cols-2">
						{activities.map(([Icon, titleField, title, bodyField, text]) => (
							<div key={title} className="border border-white/15 bg-black/20 p-7 sm:p-9">
								<Icon className="size-8 text-orange-400" />
								<h3 className="mt-12 font-black font-display text-3xl uppercase">
									<OfferText field={titleField} fallback={title} />
								</h3>
								<p className="mt-3 text-white/55 leading-7">
									<OfferText field={bodyField} fallback={text} multiline={true} />
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="py-20 md:py-28">
				<div className="site-container grid gap-10 lg:grid-cols-2">
					<div>
						<span className="eyebrow">
							<OfferText field="summerBaseEyebrow" fallback="Dobra baza to połowa przygody" />
						</span>
						<h2 className="mt-4 font-black font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
							<OfferText field="summerBaseTitle" fallback="Co czeka" />
							<br />
							<OfferText field="summerBaseAccent" fallback="na miejscu?" />
						</h2>
					</div>
					<Accordion type="single" collapsible={true} className="w-full">
						<AccordionItem value="sprzet">
							<AccordionTrigger>
								<OfferText field="summerFaqEquipmentTitle" fallback="Sprzęt i instruktorzy" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="summerFaqEquipmentBody"
									fallback="Wakeboard, windsurfing, katamarany, SUP-y, kajaki, łodzie żaglowe, narty wodne i sprzęt motorowodny. Zajęcia dopasowujemy do poziomu uczestników."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="baza">
							<AccordionTrigger>
								<OfferText field="summerFaqBaseTitle" fallback="WAKE & SURF Village" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="summerFaqBaseBody"
									fallback="Prywatne molo, piaszczysta plaża, strefa chill, miejsce grillowe i ogniskowe, sauna, boisko, parking oraz zaplecze sanitarne."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="jedzenie">
							<AccordionTrigger>
								<OfferText field="summerFaqFoodTitle" fallback="Surf Bistro i eventy" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText
									field="summerFaqFoodBody"
									fallback="Menu cateringowe na zamówienie, włoska pizza z pieca opalanego drewnem oraz przestrzeń na imprezy rodzinne i firmowe."
									multiline={true}
								/>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="lokalizacja">
							<AccordionTrigger>
								<OfferText field="summerFaqTravelTitle" fallback="Dojazd" />
							</AccordionTrigger>
							<AccordionContent>
								<OfferText field="summerFaqTravelBody" fallback="Poręba, ul. Nad Zaporą 21 — nad Jeziorem Łąckim, kilka minut od Pszczyny." multiline={true} />
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</section>
			<PhotoMosaic
				offer={offer}
				label="SHOWlato bez filtra"
				labelField="summerMosaicLabel"
				imageFields={["summerMosaicOneImageUrl", "summerMosaicTwoImageUrl", "summerMosaicThreeImageUrl"]}
				photos={[
					{ src: "/media/summer-wake-hero.jpg", alt: "Wakeboard na Jeziorze Łąckim z lotu ptaka", position: "object-[60%_center]" },
					{ src: "/media/summer-sailing-drone.jpg", alt: "Katamaran SHOWteam na Jeziorze Łąckim", position: "object-[35%_center]" },
					{ src: "/media/summer-double-wake.jpg", alt: "Dwie osoby na wakeboardzie za łodzią SHOWteam" },
				]}
			/>
			<CmsDetails offer={offer} />
			<ContactCta title={<OfferCtaTitle />} applicationOffer={offer.title} />
		</OfferInlineEditor>
	);
}
