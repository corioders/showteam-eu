import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Offers: CollectionConfig = {
  slug: "offers",
  labels: { singular: "Oferta", plural: "Oferty" },
  admin: {
    useAsTitle: "title",
    group: "Treści strony",
    defaultColumns: ["title", "category", "season", "updatedAt"],
    description: "Treści widoczne na stronie głównej i podstronach ofertowych.",
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  defaultSort: "sortOrder",
  fields: [
    {
      type: "row",
      fields: [
        { name: "title", label: "Nazwa oferty", type: "text", required: true },
        {
          name: "slug",
          label: "Rodzaj strony",
          type: "select",
          required: true,
          unique: true,
          options: [
            { label: "Lato", value: "lato" },
            { label: "Zima", value: "zima" },
            { label: "Szkolenia", value: "szkolenia" },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "category",
          label: "Kategoria",
          type: "select",
          required: true,
          options: ["Lato", "Zima", "Szkolenia"],
        },
        { name: "season", label: "Etykieta sezonu", type: "text", required: true, defaultValue: "Sezon 2026" },
        { name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 10 },
      ],
    },
    { name: "location", label: "Lokalizacja", type: "text", required: true },
    { name: "summary", label: "Krótki opis", type: "textarea", required: true, maxLength: 360 },
    {
      name: "cover",
      label: "Nowe zdjęcie okładkowe",
      type: "upload",
      relationTo: "media",
      admin: { description: "Opcjonalnie. Bez nowego zdjęcia strona użyje obecnej fotografii SHOWteam." },
    },
    {
      name: "staticImage",
      label: "Obecne zdjęcie SHOWteam",
      type: "select",
      required: true,
      defaultValue: "lake",
      options: [
        { label: "Wakeboard — jezioro", value: "lake" },
        { label: "Narty — Dolomity", value: "snow" },
        { label: "Windsurfing — baza", value: "training" },
      ],
    },
    {
      name: "dates",
      label: "Terminy",
      type: "array",
      labels: { singular: "Termin", plural: "Terminy" },
      fields: [
        { name: "label", label: "Nazwa", type: "text" },
        { name: "date", label: "Data", type: "text", required: true },
      ],
    },
    {
      name: "highlights",
      label: "Najważniejsze punkty",
      type: "array",
      labels: { singular: "Punkt", plural: "Punkty" },
      maxRows: 8,
      fields: [{ name: "text", label: "Treść", type: "text", required: true }],
    },
    {
      name: "sections",
      label: "Sekcje szczegółowe",
      type: "array",
      labels: { singular: "Sekcja", plural: "Sekcje" },
      fields: [
        { name: "title", label: "Nagłówek", type: "text", required: true },
        { name: "body", label: "Treść", type: "textarea", required: true },
      ],
    },
    { name: "published", label: "Widoczna na stronie", type: "checkbox", defaultValue: true },
  ],
};
