import { getCloudflareContext } from "@opennextjs/cloudflare";

import { stampTelemetryEnvironment, telemetryEnvironmentFromAppEnvironment } from "@/telemetry/environment";

const maximumPayloadBytes = 1_000_000;

export async function POST(request: Request): Promise<Response> {
	if (process.env["CORIODERS_TELEMETRY_DISABLED"] === "1") {
		return new Response(null, { status: 204 });
	}
	if (request.headers.get("content-type")?.startsWith("application/json") !== true) {
		return new Response(null, { status: 415 });
	}

	const payloadBytes = await request.arrayBuffer();
	if (payloadBytes.byteLength === 0 || payloadBytes.byteLength > maximumPayloadBytes) {
		return new Response(null, { status: 413 });
	}
	let payload: unknown;
	try {
		payload = JSON.parse(new TextDecoder().decode(payloadBytes));
	} catch {
		return new Response(null, { status: 400 });
	}
	const stampedPayload = stampTelemetryEnvironment(payload, telemetryEnvironmentFromAppEnvironment(process.env["APP_ENV"]));

	const { env } = await getCloudflareContext({ async: true });
	if (env.CORIODERS_TELEMETRY === undefined) {
		return new Response(null, { status: 204 });
	}

	try {
		const response = await env.CORIODERS_TELEMETRY.fetch("https://corioders-telemetry.invalid/v1/traces", {
			body: JSON.stringify(stampedPayload),
			headers: { "content-type": "application/json" },
			method: "POST",
		});
		return new Response(response.body, response);
	} catch {
		return new Response(null, { status: 204 });
	}
}
