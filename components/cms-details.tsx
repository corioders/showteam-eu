import { OfferSectionList } from "@/components/editor/offer-inline-editor";
import type { Offer } from "@/lib/offers";

export function CmsDetails({ offer }: { offer: Offer }) {
  return (
    <section className="py-20 md:py-28">
      <div className="site-container grid gap-10 lg:grid-cols-2">
        <div><span className="eyebrow">Szczegóły oferty</span><h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Wszystko,<br />co ważne.</h2></div>
        <OfferSectionList offer={offer} />
      </div>
    </section>
  );
}
