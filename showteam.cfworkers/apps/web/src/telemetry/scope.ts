import { type Attributes, SpanStatusCode, trace } from "@opentelemetry/api";

export type TelemetryOutcome = "error" | "ok" | "unconfirmed";

export interface TelemetryScope extends Disposable {
	fail(error: Error): void;
	ok(): void;
}

export function createTelemetryScope(name: string, attributes?: Attributes): TelemetryScope {
	const span = trace.getTracer("corioders.telemetry").startSpan(name, attributes === undefined ? undefined : { attributes });
	let outcome: TelemetryOutcome = "unconfirmed";
	let ended = false;

	return {
		fail(error) {
			if (ended) {
				return;
			}

			outcome = "error";
			span.recordException(error);
			span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
		},
		ok() {
			if (ended || outcome === "error") {
				return;
			}

			outcome = "ok";
			span.setStatus({ code: SpanStatusCode.OK });
		},
		[Symbol.dispose]() {
			if (ended) {
				return;
			}

			ended = true;
			span.setAttribute("corioders.outcome", outcome);
			if (outcome === "unconfirmed") {
				span.setStatus({ code: SpanStatusCode.ERROR, message: "Scope ended without explicit outcome" });
				span.addEvent("corioders.scope.unconfirmed");
			}
			span.end();
		},
	};
}
