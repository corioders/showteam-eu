import { getCloudflareContext } from "@opennextjs/cloudflare";

const maximumPayloadBytes = 1_000_000;

export async function POST(request: Request): Promise<Response> {
	if (request.headers.get("content-type")?.startsWith("application/json") !== true) {
		return new Response(null, { status: 415 });
	}

	const payload = await request.arrayBuffer();
	if (payload.byteLength === 0 || payload.byteLength > maximumPayloadBytes) {
		return new Response(null, { status: 413 });
	}

	const { env } = await getCloudflareContext({ async: true });
	if (env.CORIODERS_TELEMETRY === undefined) {
		return new Response(null, { status: 204 });
	}

	const response = await env.CORIODERS_TELEMETRY.fetch("https://corioders-telemetry.invalid/v1/traces", {
		body: payload,
		headers: { "content-type": "application/json" },
		method: "POST",
	});
	return new Response(response.body, response);
}
