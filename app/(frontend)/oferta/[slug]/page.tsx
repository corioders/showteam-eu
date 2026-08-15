import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { OfferInlineEditor, OfferListsSection } from "@/components/editor/offer-inline-editor";
import { PageHero } from "@/components/page-hero";
import { getOffer, getOffers } from "@/lib/cms";

export const revalidate = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const offers = await getOffers();
  return offers.map((offer) => ({ slug: offer.href.split("/").at(-1)! }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) return {};
  return { title: offer.title, description: offer.summary, alternates: { canonical: offer.href } };
}

export default async function OfferPage({ params }: Props) {
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) notFound();

  return <OfferInlineEditor key={offer.cmsId ?? offer.href} offer={offer}>
    <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} offer={offer} />
    <OfferListsSection offer={offer} />
    <CmsDetails offer={offer} />
    <ContactCta title="Zapytaj o szczegóły" />
  </OfferInlineEditor>;
}
