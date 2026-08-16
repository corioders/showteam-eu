import { APIError, type CollectionConfig } from "payload";
import { ensureOperationalTables } from "@/lib/operational-tables";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export function createBookingsCollection(database: D1Database): CollectionConfig {
  const releaseSlots = async (reservationId: unknown) => {
    if (reservationId) {
      await ensureOperationalTables(database);
      await database.prepare("DELETE FROM booking_slots WHERE reservation_id = ?").bind(String(reservationId)).run();
    }
  };

  return {
    slug: "bookings",
    labels: { singular: "Rezerwacja", plural: "Rezerwacje klientów" },
    admin: {
      components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
      hideAPIURL: true,
      useAsTitle: "reference",
      group: "Rezerwacje",
      defaultColumns: ["bookingDate", "startTime", "customerName", "status"],
      description: "Rezerwacje internetowe. Terminy zmieniaj przez anulowanie i utworzenie nowej rezerwacji, aby nie ominąć kontroli dostępności.",
    },
    access: { read: isLoggedIn, create: () => false, update: isLoggedIn, delete: isLoggedIn },
    defaultSort: "-bookingDate",
    hooks: {
      beforeChange: [async ({ data, originalDoc, operation }) => {
        if (operation === "update" && originalDoc?.status === "cancelled" && data.status !== "cancelled") {
          throw new APIError("Ta rezerwacja była anulowana, więc jej termin został zwolniony. Utwórz nową rezerwację, aby bezpiecznie sprawdzić, czy termin nadal jest wolny.", 409, null, true);
        }
        return data;
      }],
      afterChange: [async ({ doc }) => { if (doc.status === "cancelled") await releaseSlots(doc.reservationId); }],
      afterDelete: [async ({ doc }) => { await releaseSlots(doc.reservationId); }],
    },
    fields: [
      { name: "status", label: "Co dzieje się z rezerwacją?", type: "select", required: true, defaultValue: "pending", options: [
        { label: "Oczekuje na potwierdzenie Asi — termin zajęty", value: "pending" },
        { label: "Potwierdzona — termin zajęty", value: "confirmed" },
        { label: "Zrealizowana — klient skorzystał", value: "completed" },
        { label: "Anulowana — termin zostanie zwolniony", value: "cancelled" },
      ], admin: { description: "Uwaga: anulowania nie można cofnąć. W razie pomyłki utwórz nową rezerwację." } },
      { name: "staffNotes", label: "Notatka dla obsługi", type: "textarea", maxLength: 1000, admin: { placeholder: "Np. klient prosi o telefon przed przyjazdem" } },
      { type: "collapsible", label: "Dane rezerwacji i klienta", admin: { initCollapsed: false, description: "Te dane pochodzą ze strony i są tylko do odczytu." }, fields: [
      { name: "reference", label: "Numer rezerwacji", type: "text", required: true, unique: true, admin: { readOnly: true } },
      { name: "reservationId", label: "Identyfikator techniczny", type: "text", required: true, unique: true, admin: { hidden: true } },
      { name: "equipment", label: "Aktywność", type: "relationship", relationTo: "equipment", required: true, admin: { readOnly: true } },
      { type: "row", fields: [
        { name: "bookingDate", label: "Data", type: "text", required: true, admin: { readOnly: true } },
        { name: "startTime", label: "Od", type: "text", required: true, admin: { readOnly: true } },
        { name: "endTime", label: "Do", type: "text", required: true, admin: { readOnly: true } },
      ] },
      { name: "customerName", label: "Imię i nazwisko", type: "text", required: true, admin: { readOnly: true } },
      { type: "row", fields: [
        { name: "phone", label: "Telefon", type: "text", required: true, admin: { readOnly: true } },
        { name: "email", label: "E-mail", type: "email", admin: { readOnly: true } },
      ] },
      { name: "customerNotes", label: "Uwagi klienta", type: "textarea", maxLength: 500, admin: { readOnly: true } },
      { name: "instructorRequired", label: "Potrzebuje instruktora", type: "checkbox", defaultValue: false, admin: { readOnly: true } },
      { name: "reminderSentAt", label: "SMS przypominający wysłano", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime", displayFormat: "dd.MM.yyyy HH:mm" } } },
      { name: "reminderResponse", label: "Odpowiedź na przypomnienie", type: "select", options: [
        { label: "Potwierdził/a", value: "confirmed" }, { label: "Anulował/a", value: "cancelled" },
      ], admin: { readOnly: true } },
      { name: "reminderRespondedAt", label: "Odpowiedź otrzymano", type: "date", admin: { readOnly: true } },
      { name: "reminderEscalatedAt", label: "Przekazano Asi do telefonu", type: "date", admin: { readOnly: true } },
      { name: "reminderTokenHash", label: "Token przypomnienia", type: "text", admin: { hidden: true, readOnly: true } },
      { name: "source", label: "Źródło", type: "select", required: true, defaultValue: "website", options: [{ label: "Strona", value: "website" }, { label: "Obsługa", value: "staff" }], admin: { readOnly: true } },
      ] },
    ],
  };
}
