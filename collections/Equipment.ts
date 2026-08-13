import { ValidationError, type CollectionConfig } from "payload";
import { slugFromName } from "@/lib/slug";
import { timeToMinutes } from "@/lib/reservations";

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
    beforeValidate: [async ({ data, originalDoc, req }) => {
      if (!data) return data;
      if (originalDoc?.slug) data.slug = originalDoc.slug;
      else {
        const base = slugFromName(String(data.name || "")) || "sprzet";
        let candidate = base;
        let suffix = 2;
        while ((await req.payload.count({ collection: "equipment", where: { slug: { equals: candidate } }, overrideAccess: true })).totalDocs) candidate = `${base}-${suffix++}`;
        data.slug = candidate;
      }
      const open = timeToMinutes(String(data.openTime || ""));
      const close = timeToMinutes(String(data.closeTime || ""));
      const duration = Number(data.durationMinutes);
      const errors = [];
      if (Number.isFinite(open) && Number.isFinite(close) && close <= open) errors.push({ path: "closeTime", label: "Godzina zakończenia", message: "Godzina zakończenia musi być późniejsza niż rozpoczęcia." });
      if (Number.isFinite(open) && Number.isFinite(close) && Number.isFinite(duration) && duration > close - open) errors.push({ path: "durationMinutes", label: "Długość jednej rezerwacji", message: "Rezerwacja nie może być dłuższa niż cały ustawiony dzień dostępności." });
      if (errors.length) throw new ValidationError({ collection: "equipment", errors, req }, req.t);
      return data;
    }],
  },
  access: {
    read: ({ req }) => req.user ? true : { active: { equals: true } },
    create: isLoggedIn,
    update: isLoggedIn,
    delete: () => false,
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
      { name: "durationMinutes", label: "Długość jednej rezerwacji (minuty)", type: "number", required: true, defaultValue: 60, min: 15, max: 720, admin: { description: "Np. 60 oznacza, że klient rezerwuje sprzęt na godzinę." } },
    ] },
    { type: "row", fields: [
      { name: "openTime", label: "Od godziny", type: "text", required: true, defaultValue: "09:00", validate: (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM." },
      { name: "closeTime", label: "Do godziny", type: "text", required: true, defaultValue: "19:00", validate: (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM." },
      { name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 100, admin: { hidden: true } },
      { name: "active", label: "Można rezerwować", type: "checkbox", defaultValue: true },
    ] },
    { name: "notice", label: "Ważna informacja dla klienta", type: "textarea", maxLength: 220, admin: { description: "Opcjonalnie, np. „Wymagane uprawnienia”. Ten tekst będzie widoczny przed rezerwacją." } },
  ],
};
