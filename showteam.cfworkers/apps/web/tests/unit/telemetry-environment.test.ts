import { describe, expect, it } from "vitest";

import { stampTelemetryEnvironment, telemetryEnvironmentFromAppEnvironment } from "../../src/telemetry/environment";

describe("telemetry environment", () => {
	it.each([
		[undefined, "dev"],
		["development", "dev"],
		["preview", "preview"],
		["production", "production"],
	])("maps %s to %s", (value, expected) => {
		expect(telemetryEnvironmentFromAppEnvironment(value)).toBe(expected);
	});

	it("stamps every OTLP resource and replaces client-provided environment", () => {
		const payload = {
			resourceSpans: [
				{
					resource: {
						attributes: [
							{ key: "service.name", value: { stringValue: "web" } },
							{ key: "deployment.environment.name", value: { stringValue: "spoofed" } },
						],
					},
				},
				{},
			],
		};

		expect(stampTelemetryEnvironment(payload, "preview")).toEqual({
			resourceSpans: [
				{
					resource: {
						attributes: [
							{ key: "service.name", value: { stringValue: "web" } },
							{ key: "deployment.environment.name", value: { stringValue: "preview" } },
						],
					},
				},
				{ resource: { attributes: [{ key: "deployment.environment.name", value: { stringValue: "preview" } }] } },
			],
		});
	});
});
