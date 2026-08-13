import type { CollectionConfig } from "payload";

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Plik", plural: "Pliki" },
  admin: {
    components: { edit: { beforeDocumentControls: ["@/components/payload/form-draft-persistence#FormDraftPersistence"] } },
    hidden: true,
    useAsTitle: "alt",
    group: "Treści",
    defaultColumns: ["filename", "alt", "updatedAt"],
    description: "Biblioteka zdjęć i filmów używanych na stronie.",
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  fields: [{ name: "alt", label: "Opis pliku", type: "text", required: true }],
  upload: {
    crop: false,
    focalPoint: true,
    skipSafeFetch: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "video/mp4", "video/webm", "video/quicktime"],
  },
};
