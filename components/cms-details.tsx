import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Offer } from "@/lib/offers";

export function CmsDetails({ offer }: { offer: Offer }) {
  if (!offer.sections?.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="site-container grid gap-10 lg:grid-cols-2">
        <div><span className="eyebrow">Szczegóły oferty</span><h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Wszystko,<br />co ważne.</h2></div>
        <Accordion type="single" collapsible>
          {offer.sections.map((section, index) => (
            <AccordionItem value={`section-${index}`} key={`${section.title}-${index}`}>
              <AccordionTrigger>{section.title}</AccordionTrigger>
              <AccordionContent>{section.body}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
