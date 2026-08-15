import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/contact-cta";
import { CmsDetails } from "@/components/cms-details";
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

  return <>
    <PageHero eyebrow={`${offer.category} · ${offer.season}`} title={offer.title} description={offer.summary} location={offer.location} image={offer.image} imageAlt={offer.imageAlt} offer={offer} />
    {(offer.dates.length > 0 || offer.highlights.length > 0) && <section className="py-20 md:py-28"><div className="site-container grid gap-12 lg:grid-cols-2">
      {offer.dates.length > 0 && <div><span className="eyebrow">Terminy</span><div className="mt-5 border border-white/15">{offer.dates.map((date, index) => <p key={`${date}-${index}`} className="border-b border-white/10 p-5 font-semibold last:border-0">{date}</p>)}</div></div>}
      {offer.highlights.length > 0 && <div><span className="eyebrow">Najważniejsze</span><div className="mt-5 border border-white/15">{offer.highlights.map((highlight, index) => <p key={`${highlight}-${index}`} className="border-b border-white/10 p-5 text-white/70 last:border-0">{highlight}</p>)}</div></div>}
    </div></section>}
    <CmsDetails offer={offer} />
    <ContactCta title="Zapytaj o szczegóły" />
  </>;
}
