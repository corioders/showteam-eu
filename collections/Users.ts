import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Użytkownik", plural: "Użytkownicy" },
  admin: { useAsTitle: "email", group: "Ustawienia" },
  auth: true,
  fields: [{ name: "name", label: "Imię", type: "text" }],
  versions: false,
};
