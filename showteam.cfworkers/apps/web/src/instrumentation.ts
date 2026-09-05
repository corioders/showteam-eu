const everyUrl = /.*/;
const telemetryCollectorUrl = /corioders-telemetry\.invalid/;

export async function register(): Promise<void> {
	if (process.env["CORIODERS_TELEMETRY_DISABLED"] === "1") {
		return;
	}
	try {
		const [{ registerOTel }, { CoriodersTraceExporter }] = await Promise.all([import("@vercel/otel"), import("@/telemetry/server-exporter")]);
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
			serviceName: "showteam-cfworkers-web",
			traceExporter: new CoriodersTraceExporter(),
			traceSampler: "always_on",
		});
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: telemetry startup failures must stay visible without taking down the application
		console.error("Failed to register OpenTelemetry", error);
	}
}

export async function onRequestError(error: unknown): Promise<void> {
	const { SpanStatusCode, trace } = await import("@opentelemetry/api");
	const span = trace.getActiveSpan();
	span?.recordException(error instanceof Error ? error : new Error(String(error)));
	span?.setStatus({ code: SpanStatusCode.ERROR });
}
