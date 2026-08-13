import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Wydarzenie", plural: "Wydarzenia i terminy" },
  admin: {
    components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
    useAsTitle: "title",
    group: "Strona internetowa",
    defaultColumns: ["title", "startDate", "location", "published"],
    description: "Tu dodajesz terminy widoczne w zakładce Wydarzenia. Wypełnij nazwę, datę, miejsce i krótki opis.",
    preview: () => "/wydarzenia",
  },
  access: {
    read: ({ req }) => req.user ? true : { published: { equals: true } },
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  defaultSort: "startDate",
  fields: [
    { name: "title", label: "Nazwa wydarzenia", type: "text", required: true, admin: { placeholder: "np. SHOWCamp — Turnus V" } },
    { type: "row", fields: [
      { name: "startDate", label: "Początek", type: "date", required: true, admin: { date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } } },
      { name: "endDate", label: "Koniec", type: "date", admin: { date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } } },
    ] },
    { name: "location", label: "Miejsce", type: "text", required: true, admin: { placeholder: "np. Wake & Surf Village · Poręba" } },
    { name: "summary", label: "Krótki opis", type: "textarea", required: true, maxLength: 400 },
    { name: "image", label: "Zdjęcie", type: "upload", relationTo: "media", admin: { description: "Opcjonalne. Jeśli nie dodasz zdjęcia, użyjemy fotografii SHOWteam." } },
    { type: "row", fields: [
      { name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Lato", options: ["Lato", "Zima", "Szkolenia", "Inne"] },
      { name: "ctaLabel", label: "Tekst przycisku", type: "text", defaultValue: "Zapytaj o miejsce" },
      { name: "published", label: "Widoczne na stronie", type: "checkbox", defaultValue: true },
    ] },
  ],
};
