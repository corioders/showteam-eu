import type { CollectionConfig } from "payload";
import { slugFromName } from "@/lib/slug";
import { revalidateOffers } from "@/lib/revalidate-public";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Offers: CollectionConfig = {
  slug: "offers",
  labels: { singular: "Strona oferty", plural: "Strony oferty" },
  admin: {
    components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
    hideAPIURL: true,
    useAsTitle: "title",
    group: "Strona internetowa",
    defaultColumns: ["title", "season", "published"],
    description: "Treści widoczne na stronie głównej i podstronach ofertowych.",
    preview: (document) => `/oferta/${document.slug}`,
  },
  access: {
    read: ({ req }) => req.user ? true : { published: { equals: true } },
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  hooks: {
    afterChange: [({ doc, req }) => { if (req.user) revalidateOffers(); return doc; }],
    afterDelete: [({ doc, req }) => { if (req.user) revalidateOffers(); return doc; }],
    beforeValidate: [async ({ data, originalDoc, req }) => {
      if (!data) return data;
      if (originalDoc?.slug) data.slug = originalDoc.slug;
      else {
        const base = slugFromName(String(data.title || "")) || "oferta";
        let candidate = base;
        let suffix = 2;
        while ((await req.payload.count({ collection: "offers", where: { slug: { equals: candidate } }, overrideAccess: true })).totalDocs) candidate = `${base}-${suffix++}`;
        data.slug = candidate;
      }
      return data;
    }],
  },
  defaultSort: "sortOrder",
  fields: [
    { type: "tabs", tabs: [
      { label: "1. Najważniejsze", description: "Nagłówek i opis widoczne na górze strony oferty.", fields: [
        { name: "title", label: "Nazwa oferty", type: "text", required: true },
        { name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Lato", options: ["Lato", "Zima", "Szkolenia", "Noclegi"] },
        { name: "location", label: "Lokalizacja", type: "text", required: true, admin: { placeholder: "np. Jezioro Łąckie · Poręba" } },
        { name: "summary", label: "Krótki opis", type: "textarea", required: true, maxLength: 360, admin: { description: "2–4 zdania zachęcające klienta." } },
        { name: "season", label: "Nazwa sezonu", type: "text", required: true, defaultValue: "Sezon 2026", admin: { description: "Np. „Sezon 2026”." } },
      ] },
      { label: "2. Terminy i szczegóły", description: "Lista terminów i informacje rozwijane niżej na stronie.", fields: [
        { name: "dates", label: "Terminy", type: "array", labels: { singular: "Termin", plural: "Terminy" }, admin: { description: "Dodaj każdy turnus lub wyjazd jako osobny termin." }, fields: [
          { name: "label", label: "Nazwa", type: "text", admin: { placeholder: "np. Turnus I" } },
          { name: "date", label: "Data lub zakres dat", type: "text", required: true, admin: { placeholder: "np. 5–11 lipca 2026" } },
        ] },
        { name: "highlights", label: "Najważniejsze punkty", type: "array", labels: { singular: "Punkt", plural: "Punkty" }, maxRows: 8, fields: [{ name: "text", label: "Treść", type: "text", required: true }] },
        { name: "sections", label: "Dłuższe sekcje", type: "array", labels: { singular: "Sekcja", plural: "Sekcje" }, fields: [
          { name: "title", label: "Nagłówek", type: "text", required: true },
          { name: "body", label: "Treść", type: "textarea", required: true },
        ] },
      ] },
      { label: "3. Zdjęcie i publikacja", description: "Okładka oraz widoczność strony.", fields: [
        { name: "cover", label: "Zdjęcie okładkowe", type: "upload", relationTo: "media", admin: { description: "Opcjonalne. Bez nowego zdjęcia zostanie obecna fotografia SHOWteam." } },
        { name: "published", label: "Pokaż ofertę na stronie", type: "checkbox", defaultValue: true },
        { name: "staticImage", label: "Zdjęcie zapasowe", type: "select", required: true, defaultValue: "lake", options: [
          { label: "Wakeboard — jezioro", value: "lake" },
          { label: "Narty — Dolomity", value: "snow" },
          { label: "Windsurfing — baza", value: "training" },
          { label: "Jezioro — zdjęcie tymczasowe", value: "stay" },
        ], admin: { hidden: true } },
      ] },
    ] },
    { name: "slug", label: "Adres strony", type: "text", required: true, unique: true, admin: { hidden: true } },
    { name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 10, admin: { hidden: true } },
  ],
};
