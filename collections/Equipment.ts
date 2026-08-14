import { APIError, ValidationError, type CollectionConfig } from "payload";
import { slugFromName } from "@/lib/slug";
import { timeToMinutes, todayInPoland } from "@/lib/reservations";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Equipment: CollectionConfig = {
  slug: "equipment",
  labels: { singular: "Sprzęt do wynajęcia", plural: "Sprzęt i godziny wynajmu" },
  admin: {
    components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
    hideAPIURL: true,
    useAsTitle: "name",
    group: "Rezerwacje",
    defaultColumns: ["name", "quantity", "active"],
    description: "Jedyne miejsce zarządzania wynajmem. To, co ustawisz tutaj, automatycznie pojawi się na stronie Rezerwacje, w dostępności i kalendarzu.",
    preview: () => "/rezerwacje",
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
      for (const number of [1, 2] as const) {
        const startField = `recommendedStart${number}` as const;
        const endField = `recommendedEnd${number}` as const;
        const start = String(data[startField] ?? originalDoc?.[startField] ?? "");
        const end = String(data[endField] ?? originalDoc?.[endField] ?? "");
        if (Boolean(start) !== Boolean(end)) errors.push({ path: start ? endField : startField, label: `Polecane okno ${number}`, message: "Wpisz obie godziny albo zostaw obie puste." });
        if (start && end && timeToMinutes(start) >= timeToMinutes(end)) errors.push({ path: endField, label: `Polecane okno ${number}`, message: "Koniec polecanego okna musi być później niż początek." });
      }
      if (errors.length) throw new ValidationError({ collection: "equipment", errors, req }, req.t);
      return data;
    }],
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      if (operation !== "update" || !originalDoc) return data;
      const scheduleFields = ["quantity", "durationMinutes", "openTime", "closeTime"] as const;
      const scheduleChanged = scheduleFields.some((field) => String(data[field] ?? originalDoc[field]) !== String(originalDoc[field]));
      if (!scheduleChanged) return data;
      const futureBookings = await req.payload.count({
        collection: "bookings",
        where: { and: [
          { equipment: { equals: originalDoc.id } },
          { bookingDate: { greater_than_equal: todayInPoland() } },
          { status: { equals: "confirmed" } },
        ] },
        overrideAccess: true,
      });
      if (futureBookings.totalDocs > 0) {
        throw new APIError("Nie można zmienić liczby sztuk ani godzin, dopóki istnieją przyszłe potwierdzone rezerwacje tego sprzętu. Najpierw je anuluj.", 409, null, true);
      }
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
    { type: "tabs", tabs: [
      { label: "1. Sprzęt", description: "To zobaczy klient podczas rezerwacji.", fields: [
        { name: "name", label: "Nazwa sprzętu", type: "text", required: true, admin: { placeholder: "np. SUP jednoosobowy" } },
        { name: "description", label: "Krótki opis", type: "textarea", required: true, maxLength: 300, admin: { description: "Napisz krótko, dla kogo jest sprzęt i co warto wiedzieć." } },
        { name: "image", label: "Zdjęcie", type: "upload", relationTo: "media" },
        { type: "row", fields: [
          { name: "category", label: "Kategoria", type: "select", required: true, defaultValue: "Woda", options: ["Woda", "Ląd", "Szkolenie", "Inne"] },
          { name: "quantity", label: "Ile sztuk jest dostępnych?", type: "number", required: true, defaultValue: 1, min: 1, max: 99 },
        ] },
        { name: "notice", label: "Ważna informacja dla klienta", type: "textarea", maxLength: 220, admin: { description: "Opcjonalnie, np. „Wymagane uprawnienia”." } },
      ] },
      { label: "2. Godziny rezerwacji", description: "Ustaw długość rezerwacji i godziny pracy.", fields: [
        { name: "durationMinutes", label: "Ile minut trwa jedna rezerwacja?", type: "number", required: true, defaultValue: 60, min: 15, max: 720, admin: { description: "Np. 60 = jedna godzina." } },
        { type: "row", fields: [
          { name: "openTime", label: "Pierwsza możliwa godzina", type: "text", required: true, defaultValue: "09:00", validate: (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM." },
          { name: "closeTime", label: "Koniec rezerwacji", type: "text", required: true, defaultValue: "19:00", validate: (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM." },
        ] },
        { name: "active", label: "Klienci mogą teraz rezerwować ten sprzęt", type: "checkbox", defaultValue: true },
      ] },
      { label: "3. Polecane warunki", description: "Podpowiedzi pogodowe widoczne podczas rezerwacji.", fields: [
        { name: "weatherProfile", label: "Jakie warunki są najlepsze?", type: "select", required: true, defaultValue: "any", options: [
          { label: "Pogoda bez znaczenia", value: "any" },
          { label: "Najlepiej bez wiatru", value: "calm" },
          { label: "Najlepiej z wiatrem", value: "wind" },
        ] },
        { type: "row", fields: [
          { name: "recommendedStart1", label: "Pierwsze okno — od", type: "text", validate: optionalTime },
          { name: "recommendedEnd1", label: "Pierwsze okno — do", type: "text", validate: optionalTime },
        ] },
        { type: "row", fields: [
          { name: "recommendedStart2", label: "Drugie okno — od", type: "text", validate: optionalTime },
          { name: "recommendedEnd2", label: "Drugie okno — do", type: "text", validate: optionalTime },
        ] },
        { name: "recommendationNote", label: "Dodatkowa podpowiedź dla klienta", type: "textarea", maxLength: 220 },
      ] },
    ] },
    { name: "slug", label: "Identyfikator", type: "text", required: true, unique: true, admin: { hidden: true } },
    { name: "sortOrder", label: "Kolejność", type: "number", required: true, defaultValue: 100, admin: { hidden: true } },
  ],
};

function optionalTime(value: unknown) {
  return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || "Wpisz godzinę jako HH:MM albo zostaw puste.";
}
