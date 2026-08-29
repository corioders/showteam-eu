// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import config from "@payload-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { TvApproval } from "@/components/tv-approval";

export default async function ConnectTvPage({ searchParams }: { searchParams: Promise<{ pair?: string; secret?: string }> }) {
	const params = await searchParams;
	const pair = params.pair || "";
	const secret = params.secret || "";
	if (!/^[0-9a-f-]{36}$/.test(pair) || !/^[A-Za-z0-9_-]{40,50}$/.test(secret)) {
		redirect("/admin");
	}
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: await headers() });
	if (!user) {
		const destination = `/a/polacz-tv?pair=${encodeURIComponent(pair)}&secret=${encodeURIComponent(secret)}`;
		redirect(`/admin/login?redirect=${encodeURIComponent(destination)}`);
	}
	return <TvApproval id={pair} secret={secret} userName={String(user.name || user.email || "SHOWteam")} />;
}
