// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { EventInquiriesAdminView } from "@/components/payload/event-inquiries-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
export default async function EventInquiriesPage() {
	await requireAdminPage("/a/imprezy");
	return (
		<AdminWorkspace active="/a/imprezy">
			<EventInquiriesAdminView />
		</AdminWorkspace>
	);
}
