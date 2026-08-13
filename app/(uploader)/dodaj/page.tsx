import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { QuickUploader } from "@/components/quick-uploader";

export const dynamic = "force-dynamic";

export default async function QuickUploadPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect("/admin/login?redirect=%2Fdodaj");

  return <QuickUploader userName={String(user.name || user.email || "SHOWteam")} />;
}
