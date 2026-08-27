// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { AdminWorkspace } from "@/components/editor/admin-workspace";
import { StayBookingsAdminView } from "@/components/payload/stay-bookings-admin-view";
import { requireAdminPage } from "@/lib/admin-page";

export default async function StayBookingsPage() {
	await requireAdminPage("/a/noclegi");
	return (
		<AdminWorkspace active="/a/noclegi">
			<StayBookingsAdminView />
		</AdminWorkspace>
	);
}
