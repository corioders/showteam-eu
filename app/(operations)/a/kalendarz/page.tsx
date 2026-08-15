import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { CalendarAdminView } from "@/components/payload/calendar-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
export default async function StaffCalendarPage() {
  await requireAdminPage("/a/kalendarz");
  return <AdminWorkspace active="/a/kalendarz"><CalendarAdminView /></AdminWorkspace>;
}
