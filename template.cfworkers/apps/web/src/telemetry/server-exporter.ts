import { getCloudflareContext } from "@opennextjs/cloudflare";
import { JsonTraceSerializer } from "@opentelemetry/otlp-transformer";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export class CoriodersTraceExporter implements SpanExporter {
	export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter["export"]>[1]): void {
		void this.send(spans).then(
			(error) => (error === null ? resultCallback({ code: 0 }) : resultCallback({ code: 1, error })),
			(error: unknown) => resultCallback({ code: 1, error: error instanceof Error ? error : new Error(String(error)) }),
		);
	}

	forceFlush(): Promise<void> {
		return Promise.resolve();
	}

	shutdown(): Promise<void> {
		return Promise.resolve();
	}

	private async send(spans: ReadableSpan[]): Promise<Error | null> {
		const payload = JsonTraceSerializer.serializeRequest(spans);
		if (payload === undefined) {
			return null;
		}
		const { env } = await getCloudflareContext({ async: true });
		if (env.CORIODERS_TELEMETRY === undefined) {
			return null;
		}
		const response = await env.CORIODERS_TELEMETRY.fetch("https://corioders-telemetry.invalid/v1/traces", {
			body: payload,
			headers: { "content-type": "application/json" },
			method: "POST",
		});
		return response.ok ? null : new Error(`Corioders telemetry export failed with HTTP ${response.status}`);
	}
}
