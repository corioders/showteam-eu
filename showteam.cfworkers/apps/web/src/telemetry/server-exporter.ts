import { getCloudflareContext } from "@opennextjs/cloudflare";
import { JsonTraceSerializer } from "@opentelemetry/otlp-transformer";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export class CoriodersTraceExporter implements SpanExporter {
	export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter["export"]>[1]): void {
		let delivery: Promise<void>;
		try {
			const { ctx, env } = getCloudflareContext();
			delivery = this.send(spans, env.CORIODERS_TELEMETRY);
			ctx.waitUntil(delivery);
		} catch {
			resultCallback({ code: 0 });
			return;
		}
		void delivery.then(
			() => resultCallback({ code: 0 }),
			() => resultCallback({ code: 0 }),
		);
	}

	forceFlush(): Promise<void> {
		return Promise.resolve();
	}

	shutdown(): Promise<void> {
		return Promise.resolve();
	}

	private async send(spans: ReadableSpan[], telemetry: CloudflareEnv["CORIODERS_TELEMETRY"]): Promise<void> {
		const payload = JsonTraceSerializer.serializeRequest(spans);
		if (payload === undefined || telemetry === undefined) {
			return;
		}
		await telemetry.fetch("https://corioders-telemetry.invalid/v1/traces", {
			body: Uint8Array.from(payload).buffer,
			headers: { "content-type": "application/json" },
			method: "POST",
		});
	}
}
