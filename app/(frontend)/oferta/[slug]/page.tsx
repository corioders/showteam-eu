import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
import { OfferCtaTitle, OfferInlineEditor, OfferListsSection, OfferLocationLink } from "@/components/editor/offer-inline-editor";
import { PageHero } from "@/components/page-hero";
import { getOffer } from "@/lib/cms";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) return {};
  return { title: offer.title, description: offer.summary, alternates: { canonical: offer.href } };
}

export default async function OfferPage({ params }: Props) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  const offer = await getOffer(slug, Boolean(user));
  if (!offer) notFound();

  return <OfferInlineEditor key={offer.cmsId ?? offer.href} offer={offer}>
    <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} offer={offer} />
    <OfferLocationLink />
    <OfferListsSection offer={offer} />
    <CmsDetails offer={offer} />
    <ContactCta title={<OfferCtaTitle />} applicationOffer={offer.category === "Noclegi" ? undefined : offer.title} directHref={offer.category === "Noclegi" ? "/noclegi" : undefined} directLabel="Zarezerwuj pobyt" />
  </OfferInlineEditor>;
}
