import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Wydarzenie", plural: "Wydarzenia i terminy" },
  admin: {
    components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
    hideAPIURL: true,
    useAsTitle: "title",
    group: "Strona internetowa",
    defaultColumns: ["title", "startDate", "published"],
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
    { type: "tabs", tabs: [
      { label: "1. Informacje", description: "Podstawowe dane widoczne dla klientów.", fields: [
        { name: "title", label: "Nazwa wydarzenia", type: "text", required: true, admin: { placeholder: "np. SHOWCamp — Turnus V" } },
        { type: "row", fields: [
          { name: "startDate", label: "Data rozpoczęcia", type: "date", required: true, admin: { date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } } },
          { name: "endDate", label: "Data zakończenia", type: "date", admin: { description: "Zostaw puste przy wydarzeniu jednodniowym.", date: { pickerAppearance: "dayOnly", displayFormat: "dd.MM.yyyy" } } },
        ] },
        { name: "location", label: "Miejsce", type: "text", required: true, admin: { placeholder: "np. Wake & Surf Village · Poręba" } },
        { name: "summary", label: "Opis dla klienta", type: "textarea", required: true, maxLength: 400, admin: { description: "Najważniejsze informacje w 2–4 zdaniach." } },
      ] },
      { label: "2. Zdjęcie i publikacja", description: "Dodaj zdjęcie i zdecyduj, czy wydarzenie ma być widoczne.", fields: [
        { name: "image", label: "Zdjęcie wydarzenia", type: "upload", relationTo: "media", admin: { description: "Opcjonalne. Bez zdjęcia pokażemy fotografię SHOWteam." } },
        { name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Lato", options: ["Lato", "Zima", "Szkolenia", "Inne"] },
        { name: "published", label: "Pokaż wydarzenie na stronie", type: "checkbox", defaultValue: true },
        { name: "ctaLabel", label: "Tekst przycisku", type: "text", defaultValue: "Zapytaj o miejsce", admin: { description: "Opcjonalne. Domyślny tekst jest odpowiedni w większości przypadków." } },
      ] },
    ] },
  ],
};
