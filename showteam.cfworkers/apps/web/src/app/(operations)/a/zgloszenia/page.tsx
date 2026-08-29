// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { ApplicationsAdminView } from "@/components/payload/applications-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export default async function ApplicationsPage() {
	await requireAdminPage("/a/zgloszenia");
	return (
		<AdminWorkspace active="/a/zgloszenia">
			<ApplicationsAdminView />
		</AdminWorkspace>
	);
}
