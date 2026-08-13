import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Zdjęcie", plural: "Zdjęcia" },
  admin: {
    hidden: true,
    useAsTitle: "alt",
    group: "Treści",
    defaultColumns: ["filename", "alt", "updatedAt"],
    description: "Biblioteka zdjęć. Ustaw punkt ostrości — galeria użyje go do kadrowania na dużych ekranach.",
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  fields: [{ name: "alt", label: "Opis zdjęcia", type: "text", required: true }],
  upload: { crop: false, focalPoint: true, skipSafeFetch: true },
};
