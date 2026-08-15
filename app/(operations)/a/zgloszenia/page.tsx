import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { ApplicationsAdminView } from "@/components/payload/applications-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
export default async function ApplicationsPage() { await requireAdminPage("/a/zgloszenia"); return <AdminWorkspace active="/a/zgloszenia"><ApplicationsAdminView /></AdminWorkspace>; }
