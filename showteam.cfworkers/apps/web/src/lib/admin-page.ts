import "server-only";

import config from "@payload-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export async function requireAdminPage(path: string) {
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: await headers() });
	if (!user) {
		redirect(`/admin/login?redirect=${encodeURIComponent(path)}`);
	}
	return user;
}
