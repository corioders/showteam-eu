import type { CollectionConfig } from "payload";
import { revalidateNews } from "@/lib/revalidate-public";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const News: CollectionConfig = {
  slug: "news",
  labels: { singular: "Aktualność", plural: "Aktualności" },
  admin: {
    components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
    hideAPIURL: true,
    useAsTitle: "title",
    group: "Strona internetowa",
    defaultColumns: ["title", "publicationDate", "published"],
    description: "Wiadomości widoczne w zakładce Aktualności. Zdjęcie jest obowiązkowe.",
    preview: () => "/aktualnosci",
  },
  access: {
    read: ({ req }) => req.user ? true : { published: { equals: true } },
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  hooks: {
    afterChange: [({ doc, req }) => { if (req.user) revalidateNews(); return doc; }],
    afterDelete: [({ doc, req }) => { if (req.user) revalidateNews(); return doc; }],
  },
  defaultSort: "-publicationDate",
  fields: [
    { name: "title", label: "Tytuł", type: "text", required: true },
    { name: "publicationDate", label: "Data publikacji", type: "date", required: true, defaultValue: () => new Date().toISOString(), admin: { date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } } },
    { name: "summary", label: "Krótki wstęp", type: "textarea", required: true, maxLength: 300, admin: { description: "Jedno–dwa zdania widoczne większym tekstem." } },
    { name: "content", label: "Treść aktualności", type: "textarea", required: true, maxLength: 3000 },
    { name: "image", label: "Zdjęcie aktualności", type: "upload", relationTo: "media", required: true },
    { name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Baza", options: ["Baza", "Wyjazdy", "Sport", "Inne"] },
    { name: "published", label: "Pokaż aktualność na stronie", type: "checkbox", defaultValue: true },
  ],
};
