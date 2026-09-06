import { telemetryEnvironmentFromAppEnvironment } from "@/telemetry/environment";

export async function register(): Promise<void> {
	if (process.env["NEXT_RUNTIME"] !== "nodejs" || process.env["CORIODERS_TELEMETRY_DISABLED"] === "1") {
		return;
	}
	try {
		const [api, contextHooks, core, resources, sdk, { CoriodersTraceExporter }] = await Promise.all([
			import("@opentelemetry/api"),
			import("@opentelemetry/context-async-hooks"),
			import("@opentelemetry/core"),
			import("@opentelemetry/resources"),
			import("@opentelemetry/sdk-trace-base"),
			import("@/telemetry/server-exporter"),
		]);
		const traceExporter = new CoriodersTraceExporter();
		const resource = resources.resourceFromAttributes({
			"deployment.environment.name": telemetryEnvironmentFromAppEnvironment(process.env["APP_ENV"]),
			"service.name": "template-cfworkers-web",
		});
		const provider = new sdk.BasicTracerProvider({
			resource,
			sampler: new sdk.AlwaysOnSampler(),
			spanProcessors: [new sdk.SimpleSpanProcessor(traceExporter)],
		});
		const contextManager = new contextHooks.AsyncLocalStorageContextManager().enable();
		api.context.setGlobalContextManager(contextManager);
		api.propagation.setGlobalPropagator(
			new core.CompositePropagator({
				propagators: [new core.W3CTraceContextPropagator(), new core.W3CBaggagePropagator()],
			}),
		);
		api.trace.setGlobalTracerProvider(provider);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: telemetry startup failures must stay visible without taking down the application
		console.error("Failed to register OpenTelemetry", error);
	}
}

export async function onRequestError(error: unknown): Promise<void> {
	if (process.env["NEXT_RUNTIME"] !== "nodejs") {
		return;
	}
	const { SpanStatusCode, trace } = await import("@opentelemetry/api");
	const span = trace.getActiveSpan();
	span?.recordException(error instanceof Error ? error : new Error(String(error)));
	span?.setStatus({ code: SpanStatusCode.ERROR });
}
