import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Konto obsługi", plural: "Konta obsługi" },
  admin: { useAsTitle: "email", hideAPIURL: true, group: "Pomoc i ustawienia", defaultColumns: ["name", "email"], description: "Osoby, które mogą logować się do panelu SHOWteam." },
  auth: true,
  fields: [{ name: "name", label: "Imię", type: "text" }],
  versions: false,
};
