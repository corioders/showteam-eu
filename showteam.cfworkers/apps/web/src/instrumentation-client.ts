import "zone.js";

import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { UserInteractionInstrumentation } from "@opentelemetry/instrumentation-user-interaction";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const exporter = new OTLPTraceExporter({ url: "/api/telemetry/v1/traces" });
const provider = new WebTracerProvider({
	resource: resourceFromAttributes({
		[ATTR_SERVICE_NAME]: "showteam-cfworkers-web-browser",
	}),
	spanProcessors: [new BatchSpanProcessor(exporter)],
});

provider.register({ contextManager: new ZoneContextManager() });
registerInstrumentations({
	instrumentations: [
		new DocumentLoadInstrumentation(),
		new UserInteractionInstrumentation({ eventNames: ["click", "submit"] }),
		new FetchInstrumentation({
			ignoreUrls: [/\/api\/telemetry\/v1\/traces$/],
			propagateTraceHeaderCorsUrls: [/.*/],
		}),
	],
});

window.addEventListener("error", ({ error, message }) => {
	const span = provider.getTracer("corioders.telemetry.browser").startSpan("browser.error");
	span.recordException(error instanceof Error ? error : new Error(message));
	span.end();
});

window.addEventListener("unhandledrejection", ({ reason }) => {
	const span = provider.getTracer("corioders.telemetry.browser").startSpan("browser.unhandledrejection");
	span.recordException(reason instanceof Error ? reason : new Error(String(reason)));
	span.end();
});

export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse"): void {
	const span = provider.getTracer("corioders.telemetry.browser").startSpan("next.navigation", {
		attributes: { "navigation.type": navigationType, "url.path": new URL(url, window.location.origin).pathname },
	});
	span.end();
}
