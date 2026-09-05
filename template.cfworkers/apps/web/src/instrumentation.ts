import { SpanStatusCode, trace } from "@opentelemetry/api";
import { registerOTel } from "@vercel/otel";

import { CoriodersTraceExporter } from "@/telemetry/server-exporter";

const everyUrl = /.*/;
const telemetryCollectorUrl = /corioders-telemetry\.invalid/;

export function register(): void {
	registerOTel({
		attributes: {
			"deployment.environment.name": process.env["APP_ENV"] ?? "development",
		},
		instrumentationConfig: {
			fetch: {
				ignoreUrls: [telemetryCollectorUrl],
				propagateContextUrls: [everyUrl],
			},
		},
		serviceName: "template-cfworkers-web",
		traceExporter: new CoriodersTraceExporter(),
		traceSampler: "always_on",
	});
}

export function onRequestError(error: unknown): void {
	const span = trace.getActiveSpan();
	span?.recordException(error instanceof Error ? error : new Error(String(error)));
	span?.setStatus({ code: SpanStatusCode.ERROR });
}
