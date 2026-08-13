import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { OperationsCalendar } from "@/components/operations-calendar";

export const dynamic = "force-dynamic";
export default async function StaffCalendarPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect("/admin/login?redirect=%2Fa%2Fkalendarz");
  return <main className="min-h-screen bg-neutral-950 p-3 text-white sm:p-6"><OperationsCalendar /></main>;
}
