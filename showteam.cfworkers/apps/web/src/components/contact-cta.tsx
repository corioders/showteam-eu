import { ArrowRight, ArrowUpRight, Mail, Phone } from "lucide-react";
import Link from "next/link";

import { OfferText } from "@/components/editor/offer-inline-editor";
import { Button } from "@/components/ui/button";

export function ContactCta({
	title = "Masz ochotę na SHOW?",
	applicationOffer,
	directHref,
	directLabel,
}: {
	title?: React.ReactNode;
	applicationOffer?: string;
	directHref?: string;
	directLabel?: string;
}) {
	return (
		<section className="bg-orange-500 py-16 text-neutral-950 md:py-24">
			<div className="site-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
				<div>
					<span className="font-bold text-xs uppercase tracking-[0.2em]">
						<OfferText field="ctaEyebrow" fallback="Twój następny ruch" />
					</span>
					<h2 className="mt-4 max-w-4xl font-black font-display text-5xl uppercase leading-[0.88] tracking-[-0.04em] sm:text-7xl lg:text-8xl">{title}</h2>
				</div>
				{directHref ? (
					<Button asChild={true} size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800">
						<Link href={directHref}>
							<OfferText field="ctaDirectButton" fallback={directLabel || "Przejdź dalej"} /> <ArrowRight className="size-4" />
						</Link>
					</Button>
				) : applicationOffer ? (
					<Button asChild={true} size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800">
						<Link href={`/zgloszenie?oferta=${encodeURIComponent(applicationOffer)}`}>
							<OfferText field="ctaApplicationButton" fallback="Wyślij zgłoszenie" /> <ArrowRight className="size-4" />
						</Link>
					</Button>
				) : (
					<div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
						<Button asChild={true} size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800">
							<a href="tel:+48500128090">
								<Phone className="size-4" /> <OfferText field="ctaCallButton" fallback="Zadzwoń do Asi" />
							</a>
						</Button>
						<Button asChild={true} size="lg" className="border border-neutral-950/20 bg-transparent text-neutral-950 hover:bg-black/10">
							<a href="mailto:biuro@showteam.eu">
								<Mail className="size-4" /> <OfferText field="ctaEmailButton" fallback="Napisz" /> <ArrowUpRight className="size-4" />
							</a>
						</Button>
					</div>
				)}
			</div>
		</section>
	);
}
