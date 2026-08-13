import type { CollectionConfig } from "payload";
import { galleryAssets } from "@/lib/gallery-assets";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Gallery: CollectionConfig = {
  slug: "gallery",
  labels: { singular: "Zdjęcie galerii", plural: "Galeria" },
  admin: {
    useAsTitle: "caption",
    group: "Treści strony",
    defaultColumns: ["caption", "season", "layout", "sortOrder", "published"],
    description: "Dodaj zdjęcie lub film, ustaw układ i opublikuj w galerii. Najprościej zrobisz to przez Szybkie dodawanie na pulpicie.",
    preview: () => "/galeria",
  },
  access: {
    read: ({ req }) => req.user ? true : { published: { equals: true } },
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  defaultSort: "-createdAt",
  fields: [
    {
      name: "image",
      label: "Zdjęcie lub film",
      type: "upload",
      relationTo: "media",
      admin: { description: "Wgraj własne zdjęcie albo film MP4, WebM lub MOV." },
    },
    {
      name: "staticImage",
      label: "Zdjęcie startowe SHOWteam",
      type: "select",
      defaultValue: galleryAssets[0].value,
      options: galleryAssets.map((asset) => ({ label: asset.label, value: asset.value })),
      admin: { description: "Używane tylko wtedy, gdy nie wgrasz nowego zdjęcia." },
    },
    { name: "caption", label: "Podpis", type: "text", required: true },
    { name: "alt", label: "Opis dla czytników ekranu", type: "text", admin: { description: "Opcjonalnie. Domyślnie użyjemy opisu wgranego zdjęcia." } },
    { type: "row", fields: [
      { name: "season", label: "Kategoria", type: "select", required: true, defaultValue: "Lato", options: ["Lato", "Zima", "Szkolenia"] },
      { name: "layout", label: "Układ na komputerze", type: "select", required: true, defaultValue: "square", options: [{ label: "Duży 2×2", value: "large" }, { label: "Szeroki 2×1", value: "wide" }, { label: "Wysoki 1×2", value: "tall" }, { label: "Kwadrat 1×1", value: "square" }] },
      { name: "mobileLayout", label: "Układ na telefonie", type: "select", required: true, defaultValue: "square", options: [{ label: "Poziomy", value: "landscape" }, { label: "Pionowy", value: "portrait" }, { label: "Kwadrat", value: "square" }] },
    ] },
    { type: "row", fields: [
      { name: "fit", label: "Dopasowanie", type: "select", required: true, defaultValue: "cover", options: [{ label: "Wypełnij kafel", value: "cover" }, { label: "Pokaż całe zdjęcie", value: "contain" }] },
      { name: "mobilePosition", label: "Kadr na telefonie", type: "select", required: true, defaultValue: "same", options: [{ label: "Jak punkt ostrości", value: "same" }, { label: "Góra", value: "50% 20%" }, { label: "Środek", value: "50% 50%" }, { label: "Dół", value: "50% 80%" }, { label: "Lewa strona", value: "20% 50%" }, { label: "Prawa strona", value: "80% 50%" }] },
    ] },
    {
      type: "row",
      fields: [
        { name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 100 },
        { name: "published", label: "Widoczne na stronie", type: "checkbox", defaultValue: true },
      ],
    },
    { name: "sourceUrl", label: "Link do źródła", type: "text", admin: { description: "Opcjonalny link do posta na Instagramie lub Facebooku." } },
  ],
};
