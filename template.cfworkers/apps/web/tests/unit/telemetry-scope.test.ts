import { trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { beforeEach, describe, expect, it } from "vitest";

import { createTelemetryScope } from "../../src/telemetry/scope";

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
trace.setGlobalTracerProvider(provider);

describe("createTelemetryScope", () => {
	beforeEach(() => exporter.reset());

	it("records success only after ok", () => {
		{
			using scope = createTelemetryScope("confirmed");
			scope.ok();
		}

		expect(exporter.getFinishedSpans()[0]?.attributes["corioders.outcome"]).toBe("ok");
	});

	it("marks a scope without an explicit outcome as unconfirmed", () => {
		{
			using _scope = createTelemetryScope("forgotten");
		}

		const span = exporter.getFinishedSpans()[0];
		expect(span?.attributes["corioders.outcome"]).toBe("unconfirmed");
		expect(span?.status.message).toBe("Scope ended without explicit outcome");
	});

	it("does not let ok overwrite an error", () => {
		{
			using scope = createTelemetryScope("failed");
			scope.fail(new Error("broken"));
			scope.ok();
		}

		expect(exporter.getFinishedSpans()[0]?.attributes["corioders.outcome"]).toBe("error");
	});
});
