import { APIError, type CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export function createBookingsCollection(database: D1Database): CollectionConfig {
  const releaseSlots = async (reservationId: unknown) => {
    if (reservationId) await database.prepare("DELETE FROM booking_slots WHERE reservation_id = ?").bind(String(reservationId)).run();
  };

  return {
    slug: "bookings",
    labels: { singular: "Rezerwacja", plural: "Rezerwacje" },
    admin: {
      useAsTitle: "reference",
      group: "Rezerwacje",
      defaultColumns: ["reference", "bookingDate", "startTime", "equipment", "customerName", "status"],
      description: "Rezerwacje internetowe. Terminy zmieniaj przez anulowanie i utworzenie nowej rezerwacji, aby nie ominąć kontroli dostępności.",
    },
    access: { read: isLoggedIn, create: () => false, update: isLoggedIn, delete: isLoggedIn },
    defaultSort: "-bookingDate",
    hooks: {
      beforeChange: [async ({ data, originalDoc, operation }) => {
        if (operation === "update" && originalDoc?.status === "cancelled" && data.status !== "cancelled") {
          throw new APIError("Anulowanej rezerwacji nie można przywrócić. Utwórz nową, aby ponownie sprawdzić dostępność terminu.", 409);
        }
        return data;
      }],
      afterChange: [async ({ doc }) => { if (doc.status === "cancelled") await releaseSlots(doc.reservationId); }],
      afterDelete: [async ({ doc }) => { await releaseSlots(doc.reservationId); }],
    },
    fields: [
      { name: "reference", label: "Numer rezerwacji", type: "text", required: true, unique: true, admin: { readOnly: true } },
      { name: "reservationId", label: "Identyfikator techniczny", type: "text", required: true, unique: true, admin: { hidden: true } },
      { name: "equipment", label: "Sprzęt", type: "relationship", relationTo: "equipment", required: true, admin: { readOnly: true } },
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
      { name: "status", label: "Status", type: "select", required: true, defaultValue: "confirmed", options: [
        { label: "Potwierdzona", value: "confirmed" },
        { label: "Zrealizowana", value: "completed" },
        { label: "Anulowana", value: "cancelled" },
      ] },
      { name: "customerNotes", label: "Uwagi klienta", type: "textarea", maxLength: 500, admin: { readOnly: true } },
      { name: "staffNotes", label: "Notatka obsługi", type: "textarea", maxLength: 1000 },
      { name: "source", label: "Źródło", type: "select", required: true, defaultValue: "website", options: [{ label: "Strona", value: "website" }, { label: "Obsługa", value: "staff" }], admin: { readOnly: true } },
    ],
  };
}
