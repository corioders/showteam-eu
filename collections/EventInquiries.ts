import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const EventInquiries: CollectionConfig = {
  slug: "event-inquiries",
  labels: { singular: "Zapytanie o imprezę", plural: "Imprezy i spływy" },
  admin: {
    hideAPIURL: true,
    useAsTitle: "reference",
    group: "Zgłoszenia",
    defaultColumns: ["createdAt", "contactName", "eventTypes", "status"],
    description: "Niezobowiązujące zapytania ze strony. Najwygodniej obsługiwać je w ekranie Imprezy.",
  },
  access: { read: isLoggedIn, create: () => false, update: isLoggedIn, delete: isLoggedIn },
  defaultSort: "-createdAt",
  fields: [
    { name: "status", label: "Status", type: "select", required: true, defaultValue: "new", options: [
      { label: "Nowe", value: "new" },
      { label: "Do oddzwonienia", value: "callback" },
      { label: "Skontaktowano się", value: "contacted" },
      { label: "Oferta wysłana", value: "offer_sent" },
      { label: "Potwierdzone", value: "confirmed" },
      { label: "Anulowane", value: "cancelled" },
    ] },
    { name: "staffNotes", label: "Notatka dla obsługi", type: "textarea", maxLength: 2000 },
    { name: "nextContactAt", label: "Następny kontakt", type: "date", admin: { date: { pickerAppearance: "dayAndTime", displayFormat: "dd.MM.yyyy HH:mm" } } },
    { name: "calendarEventId", label: "Wydarzenie w kalendarzu", type: "text", admin: { readOnly: true } },
    { type: "collapsible", label: "Dane wysłane przez klienta", admin: { initCollapsed: false }, fields: [
      { name: "reference", label: "Numer zapytania", type: "text", required: true, unique: true, admin: { readOnly: true } },
      { name: "eventTypes", label: "Rodzaj", type: "select", hasMany: true, required: true, options: [
        { label: "Impreza", value: "party" }, { label: "Spływ", value: "canoe" },
      ], admin: { readOnly: true } },
      { name: "dateOptions", label: "Orientacyjne terminy", type: "array", required: true, minRows: 1, admin: { readOnly: true }, fields: [
        { name: "startDate", label: "Od", type: "date", required: true },
        { name: "endDate", label: "Do", type: "date" },
      ] },
      { type: "row", fields: [
        { name: "startTime", label: "Planowany początek", type: "text", required: true, admin: { readOnly: true } },
        { name: "endTime", label: "Planowane zakończenie", type: "text", required: true, admin: { readOnly: true } },
      ] },
      { type: "row", fields: [
        { name: "adults", label: "Dorośli", type: "number", required: true, min: 0, admin: { readOnly: true } },
        { name: "children", label: "Dzieci", type: "number", required: true, min: 0, admin: { readOnly: true } },
        { name: "childrenAgeRange", label: "Wiek dzieci", type: "text", admin: { readOnly: true } },
      ] },
      { name: "activities", label: "Wybrane aktywności", type: "relationship", relationTo: "equipment", hasMany: true, admin: { readOnly: true } },
      { name: "specialActivities", label: "Spływy", type: "text", hasMany: true, admin: { readOnly: true } },
      { name: "cateringOptions", label: "Wybrane propozycje cateringu", type: "text", hasMany: true, admin: { readOnly: true } },
      { name: "cateringNotes", label: "Własny pomysł na catering", type: "textarea", admin: { readOnly: true } },
      { name: "attractionOptions", label: "Wybrane atrakcje dodatkowe", type: "text", hasMany: true, admin: { readOnly: true } },
      { name: "attractionNotes", label: "Własny pomysł na atrakcje", type: "textarea", admin: { readOnly: true } },
      { name: "wishes", label: "Dodatkowe życzenia", type: "textarea", admin: { readOnly: true } },
      { type: "row", fields: [
        { name: "contactName", label: "Imię i nazwisko", type: "text", required: true, admin: { readOnly: true } },
        { name: "company", label: "Firma", type: "text", admin: { readOnly: true } },
      ] },
      { type: "row", fields: [
        { name: "phone", label: "Telefon", type: "text", required: true, admin: { readOnly: true } },
        { name: "email", label: "E-mail", type: "email", required: true, admin: { readOnly: true } },
      ] },
      { name: "privacyConsent", label: "Zgoda na obsługę zapytania", type: "checkbox", required: true, admin: { readOnly: true } },
    ] },
  ],
};
