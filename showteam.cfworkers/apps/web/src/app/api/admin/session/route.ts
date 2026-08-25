import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const payload = await getPayload({ config });
	const { user } = await payload.auth({ headers: request.headers });
	if (!user) {
		return NextResponse.json({ message: "Zaloguj się, aby edytować stronę." }, { status: 401 });
	}

	return NextResponse.json(
		{
			user: {
				email: String(user.email),
				name: "name" in user && typeof user.name === "string" ? user.name : undefined,
			},
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
