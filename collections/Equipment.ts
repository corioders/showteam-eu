import type { CollectionConfig } from "payload";
import { slugFromName } from "@/lib/slug";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Equipment: CollectionConfig = {
  slug: "equipment",
  labels: { singular: "Sprzęt", plural: "Sprzęt do rezerwacji" },
  admin: {
    useAsTitle: "name",
    group: "Rezerwacje",
    defaultColumns: ["name", "category", "quantity", "durationMinutes", "active"],
    description: "Jedyne miejsce zarządzania wynajmem. To, co ustawisz tutaj, automatycznie pojawi się na stronie Rezerwacje, w dostępności i kalendarzu.",
  },
  hooks: {
    beforeValidate: [({ data, originalDoc }) => {
      if (!data) return data;
      data.slug = originalDoc?.slug || slugFromName(String(data.name || ""));
      return data;
    }],
  },
  access: {
    read: ({ req }) => req.user ? true : { active: { equals: true } },
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  defaultSort: "sortOrder",
  fields: [
    { name: "name", label: "Nazwa", type: "text", required: true },
    { name: "slug", label: "Identyfikator", type: "text", required: true, unique: true, admin: { hidden: true } },
    { name: "description", label: "Opis dla klienta", type: "textarea", required: true, maxLength: 300 },
    { name: "image", label: "Zdjęcie", type: "upload", relationTo: "media" },
    { type: "row", fields: [
      { name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Woda", options: ["Woda", "Ląd", "Szkolenie", "Inne"] },
      { name: "quantity", label: "Liczba sztuk", type: "number", required: true, defaultValue: 1, min: 1, max: 99 },
      { name: "durationMinutes", label: "Długość rezerwacji (min)", type: "number", required: true, defaultValue: 60, min: 15, max: 720 },
    ] },
    { type: "row", fields: [
      { name: "openTime", label: "Od godziny", type: "text", required: true, defaultValue: "09:00", validate: (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM." },
      { name: "closeTime", label: "Do godziny", type: "text", required: true, defaultValue: "19:00", validate: (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM." },
      { name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 100 },
      { name: "active", label: "Można rezerwować", type: "checkbox", defaultValue: true },
    ] },
    { name: "notice", label: "Ważna informacja", type: "textarea", maxLength: 220, admin: { description: "Np. wymagane uprawnienia albo informacja o potwierdzeniu przez obsługę." } },
  ],
};
