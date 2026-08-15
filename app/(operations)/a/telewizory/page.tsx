import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { TvDevicesAdminView } from "@/components/payload/tv-devices-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
export default async function TelevisionsPage() { await requireAdminPage("/a/telewizory"); return <AdminWorkspace active="/a/telewizory"><TvDevicesAdminView /></AdminWorkspace>; }
