// biome-ignore-all lint/style/noNonNullAssertion: Legacy SHOWteam behavior is preserved during the structural template migration.
import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import { ArrowDownRight, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";

import { OfferCover, OfferHeroFields } from "@/components/editor/offer-inline-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Offer } from "@/lib/offers";
import { resolveStaticImage } from "@/lib/static-images";

export function PageHero({
	eyebrow,
	title,
	description,
	location,
	image,
	imageAlt,
	offer,
	applicationHref,
	applicationLabel,
}: {
	eyebrow: string;
	title: string;
	description: string;
	location: string;
	image: string;
	imageAlt: string;
	offer?: Offer;
	applicationHref?: string;
	applicationLabel?: string;
}) {
	return (
		<section className="grain relative min-h-[82vh] overflow-hidden pt-20">
			{offer ? (
				<OfferCover offer={offer} />
			) : resolveStaticImage(image) ? (
				<StaticImage src={resolveStaticImage(image)!} alt={imageAlt} loading="eager" className="absolute inset-0 size-full object-cover" sizes="100vw" />
			) : null}
			<div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
			<div className="site-container relative flex min-h-[calc(82vh-5rem)] items-end py-12 md:py-20">
				<div className="max-w-4xl">
					<Button asChild={true} variant="outline" size="sm" className="mb-10">
						<Link href="/">
							<ArrowLeft className="size-4" /> Wróć
						</Link>
					</Button>
					{offer ? (
						<OfferHeroFields offer={offer} />
					) : (
						<>
							<Badge>{eyebrow}</Badge>
							<h1 className="mt-6 font-black font-display text-[clamp(4.2rem,13vw,10rem)] uppercase leading-[0.79] tracking-[-0.055em]">{title}</h1>
							<div className="mt-8 grid max-w-3xl gap-5 border-orange-500 border-l-2 pl-5 sm:grid-cols-[1fr_auto] sm:items-end">
								<p className="text-base text-white/70 leading-7 sm:text-lg">{description}</p>
								<p className="flex items-center gap-2 whitespace-nowrap font-semibold text-sm">
									<MapPin className="size-4 text-orange-400" /> {location}
								</p>
							</div>
						</>
					)}
					{applicationHref ? (
						<Button asChild={true} size="lg" className="mt-8 bg-orange-500 text-black hover:bg-orange-400">
							<Link href={applicationHref}>{applicationLabel || "Wyślij zgłoszenie"}</Link>
						</Button>
					) : null}
					<ArrowDownRight className="mt-10 size-9 text-orange-500" />
				</div>
			</div>
		</section>
	);
}
