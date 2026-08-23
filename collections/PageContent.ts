import type { CollectionConfig } from "payload";
import { revalidatePageContent } from "@/lib/revalidate-public";

const pagePaths = { home: "/", contact: "/kontakt", gallery: "/galeria", reservations: "/rezerwacje", stays: "/noclegi", application: "/zgloszenie", eventInquiry: "/zorganizuj-impreze" } as const;
const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const PageContent: CollectionConfig = {
  slug: "page-content",
  labels: { singular: "Treść strony", plural: "Treści stron" },
  admin: { hidden: true, useAsTitle: "page" },
  timestamps: false,
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: () => false },
  hooks: {
    afterChange: [({ doc }) => {
      const page = doc.page as keyof typeof pagePaths;
      if (page in pagePaths) revalidatePageContent(page);
      return doc;
    }],
  },
  fields: [
    { name: "page", type: "select", required: true, unique: true, options: Object.keys(pagePaths) },
    { name: "content", type: "json", required: true },
  ],
};
