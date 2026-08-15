import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { StatisticsAdminView } from "@/components/payload/statistics-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
export default async function StatisticsPage() { await requireAdminPage("/a/statystyki"); return <AdminWorkspace active="/a/statystyki"><StatisticsAdminView /></AdminWorkspace>; }
