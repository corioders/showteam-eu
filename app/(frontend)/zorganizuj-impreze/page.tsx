import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { EventInquiryForm } from "@/components/event-inquiry-form";
import { EditableImage, EditableText, PageContentEditor } from "@/components/editor/page-content-editor";
import { getPageContent } from "@/lib/page-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Zorganizuj imprezę lub spływ",
  description: "Zorganizuj imprezę, spływ kajakowy i aktywny dzień w WAKE & SURF Village.",
  alternates: { canonical: "/zorganizuj-impreze" },
};

export default async function OrganizeEventPage() {
  const payload = await getPayload({ config });
  const [equipment, settings, pageContent] = await Promise.all([
    payload.find({ collection: "equipment", overrideAccess: true, limit: 100, sort: "sortOrder", where: { active: { equals: true } } }),
    payload.findGlobal({ slug: "event-settings", overrideAccess: true }),
    getPageContent("eventInquiry"),
  ]);
  return <PageContentEditor page="eventInquiry" initial={pageContent.values}>
    <section className="relative overflow-hidden border-b border-white/10 pb-16 pt-32 sm:pb-24 sm:pt-40">
      <EditableImage field="heroImageUrl" alt="Impreza w WAKE & SURF Village" sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/75" />
      <div className="site-container relative"><p className="eyebrow"><EditableText field="eyebrow" /></p><h1 className="mt-5 max-w-6xl whitespace-pre-line font-display text-[clamp(4rem,11vw,9rem)] font-black uppercase leading-[.82] tracking-[-.04em]"><EditableText field="title" multiline /></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/65"><EditableText field="description" multiline /></p></div>
    </section>
    <section className="py-12 sm:py-20"><div className="site-container"><EventInquiryForm
      today={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date())}
      activities={equipment.docs.map((activity) => ({ id: activity.id, name: activity.name }))}
      catering={(settings.cateringOptions || []).map((option) => option.label)}
      attractions={(settings.attractionOptions || []).map((option) => option.label)}
    /></div></section>
  </PageContentEditor>;
}
